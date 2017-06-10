// Constantes (mensagens)
const PLAYING = "Tocando";
const NOT_PLAYING = "Parado";
const STREAM_ERROR = "Não foi possível tocar essa rádio.";
const STREAM_TRYING = "Sintonizando...";
const URL_INSERT = "Insira a URL";
const RANDOM_NEXT = "Próxima música";
const RANDOM_FIRST = "Conectando ao armazenamento...";

// Variáveis globais
var timeout;
var state;


// Funções

// É assíncrona, retorna promisse
function update_state() {
	return $.get( "/api", function( data ) {
		state = data;

		// Atualiza play-stop, status e nome
		if(state.playing) {
			$("#status").html(PLAYING);
			$("#span-ps").attr('class', 'glyphicon glyphicon-stop');
		} else {
			$("#status").html(NOT_PLAYING);
			$("#span-ps").attr('class', 'glyphicon glyphicon-play');
		}
		$("#song").html(state.song);

		// Se local e tocando: atualiza duração, tempo e exibe
		if(state.local && state.playing) {
			$("#elapsed").html(to_min_sec(state.elapsed));
			$("#length").html(to_min_sec(state.length));
			$("#progress").show();
		} else {
			$("#progress").hide();
		}
	});
};

function to_min_sec(sec) {
 	return new Date(sec * 1000).toISOString().substr(14, 5);
}

function show_player(update) {
	// Default parameter. Seems need for some Android's Chrome
	update = typeof update !== 'undefined' ?  update : true;

	function set_visibility() {
		$("#alert").hide();
		$("#radios").hide();
		$("#player").show();
	}

	if(update)
		// Esperar update_state (é assíncrona) para mostrar player
		update_state().then(function (response) { set_visibility(); });
	else
		set_visibility();
}

function show_radios() {
	$("#silence").hide();   // Estratégico para só aparecer quando pedido.
	$("#alert").hide();
	$("#player").hide();
	$("#radios").show();
}

function show_alert(text) {
	$("#alert-text").text(text);
	$("#player").hide();
	$("#radios").hide();
	$("#alert").show();
}

function vol_osd(vol) {
	$("#osd-text").html(vol);
	$("#player-bottom").hide();
	$("#osd").show();
	clearTimeout(timeout);
	timeout = setTimeout(function() {
		$("#osd").hide();
		$("#player-bottom").show();
	}, 1300);
}

// Decide o que mostrar ao iniciar, baseado se
// está tocando. Inclui mensagem amigável.
function start_view() {
	update_state().then(function (response) {
		if(state.playing) {
			show_player(false);
		} else {
			show_radios();
			$("#silence").show();
		}
	});
}

function play_stream(type, value) {
	show_alert(STREAM_TRYING);

	$.post("/api", {cmd: "play_stream", type: type, value: value})
	.done(function() {
		setTimeout(function() {
			show_player();
		}, 2000);
	})
	.fail(function() {
		show_radios();
		alert(STREAM_ERROR);
	});
}


// Documento
$( document ).ready(function() {
	start_view();

	// Pausa atualização se janela não está em foco
	// e esconde player se visível
	window_focus = true;
	$(window)
		.focus(function() {
			window_focus = true;
			if( $("#alert").is(":visible") ) start_view();
		})
		.blur(function() {
			window_focus = false;
			show_alert(document.title);
		});

	// Atualiza player periodicamente
	setInterval(function() {
		if( $("#player").is(":visible") && window_focus ) update_state();
	}, 3000);

	// Soma um segundo periodicamente ao tempo tocado exibido na tela
	setInterval(function() {
		if($("#player").is(":visible") && state.playing && state.local &&
			state.elapsed < state.length) {			// prevent outgrowing length
			state.elapsed++;
			$("#elapsed").text(to_min_sec(state.elapsed));
		}
	}, 1000);

	// "Desclica" botões após clicados
	$("button").click(function( event ){
		$(this).blur();
	});

	// Previne href="#" de ser executado
	$('a[href="#"]').click(function( event ) {
    return false;
	});

	$("#btn-vup").click(function( event ) {
		$.post( "/api", { cmd: "vup" }, function( data ) { vol_osd(data); });
	});

	$("#btn-vdown").click(function( event ) {
		$.post( "/api", { cmd: "vdown" }, function( data ) { vol_osd(data); });
	});

	$("#btn-ps").click(function( event ) {
		if(state.playing)
			$.post( "/api", { cmd: "stop" }, function( data ) { update_state(); });
		else
			$.post( "/api", { cmd: "play" }, function( data ) { update_state(); });
	});

	$("#btn-random").click(function( event ) {
		// Define which alert to show based on player state
		if( state.playing && state.local ) {
			text = RANDOM_NEXT;
			time = 1500;
		} else {
			text = RANDOM_FIRST;
			time = 5000;
		}
		show_alert(text);
		$.post( "/api", { cmd: "play_random" })
			.always(function(data) {
				setTimeout(function() {
					show_player();
				}, time);
			});
	});

	$("#btn-radios").click(function( event ) {
		show_radios();
	});

	$("#btn-player").click(function( event ) {
		show_player();
	});

	$(".radio-name").click(function( event ) {
		name = $(this).text();
		play_stream("name", name);
	});

	$("#insert").click(function( event ) {
		url = prompt(URL_INSERT);
		if(url != null)
			play_stream("url", url);
		});
});
