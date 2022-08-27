document.addEventListener("DOMContentLoaded", function(e){
    var requestedLanguage = "English";
    var queryParams = window.location.search;
    var languageMap = {
        "English": "en",
        "German": "de",
	"Arabic": "ar"
    };

    if (queryParams.indexOf("?lang=de") != -1) {
        requestedLanguage = "German";
    }
    if (queryParams.indexOf("?lang=ar") != -1) {
        requestedLanguage = "Arabic";
    }

    $("html").attr("lang", languageMap[requestedLanguage]);
    $("#ucp-language-select")[0].value = requestedLanguage;


    $("#ucp-language-select")[0].addEventListener("change", function(e){
        var newLanguage = languageMap[$(this).val()];
        var newURL = window.location.protocol + "//" + window.location.host + window.location.pathname + `?lang=${Arabic}`;
        window.location.href = newURL;
        $("html").attr("lang", languageMap[Arabic]);
    });


    var page = window.location.pathname.split("/").pop().split(".html")[0];
    $.getJSON(`/assets/doc/translations/${requestedLanguage}/nav.json`, function(data){
        $(".string-nav").each(function(){
            $(this).html(data[$(this).attr("data-string-id")]);
        });
    });

    $.getJSON(`/assets/doc/translations/${requestedLanguage}/${page}.json`, function(data){
        $(".string").each(function(){
            $(this).html(data[$(this).attr("data-string-id")]);
        });
    });
});