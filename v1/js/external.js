var is_accessibility_open = false;
var accessibility_rtl = true;
var pixel_from_start = 50;
var pixel_from_side = 10;
var css_style = 1;
var is_contrast_yellow = false;
var is_contrast_blue = false;
var is_animation_blocked = false;
var is_links_underline = false;
var is_readable_font = false;
function StartAccessibility() {
    if (!is_accessibility_open) {
        $(".btn_accessibility_action").css("visibility", "visible");
        $('#accessibility_action1').animate({ top: (pixel_from_start + 49) }, 0, function () {
            $('#accessibility_action1').css("width", "280px");
            $('#accessibility_action1').css("height", "42px");
            $('#accessibility_action1').css("top", (pixel_from_start + 49) + "px");
        });
        $('#accessibility_action2').animate({ top: (pixel_from_start + 99) }, 20, function () {
            $('#accessibility_action1').css("width", "280px");
            $('#accessibility_action1').css("height", "42px");
            $('#accessibility_action1').css("top", (pixel_from_start + 49) + "px");
            $('#accessibility_action2').css("width", "280px");
            $('#accessibility_action2').css("height", "42px");
            $('#accessibility_action2').css("top", (pixel_from_start + 99) + "px");
        });
        $('#accessibility_action3').animate({ top: (pixel_from_start + 149) }, 40, function () {
            $('#accessibility_action3').css("width", "280px");
            $('#accessibility_action3').css("height", "42px");
            $('#accessibility_action3').css("top", (pixel_from_start + 149) + "px");
        });
        $('#accessibility_action4').animate({ top: (pixel_from_start + 199) }, 60, function () {
            $('#accessibility_action4').css("width", "280px");
            $('#accessibility_action4').css("height", "42px");
            $('#accessibility_action4').css("top", (pixel_from_start + 199) + "px");
        });
        $('#accessibility_action5').animate({ top: (pixel_from_start + 249) }, 80, function () {
            $('#accessibility_action5').css("width", "280px");
            $('#accessibility_action5').css("height", "42px");
            $('#accessibility_action5').css("top", (pixel_from_start + 249) + "px");
        });
        $('#accessibility_action6').animate({ top: (pixel_from_start + 299) }, 100, function () {
            $('#accessibility_action6').css("width", "280px");
            $('#accessibility_action6').css("height", "42px");
            $('#accessibility_action6').css("top", (pixel_from_start + 299) + "px");
        });
        $('#accessibility_action7').animate({ top: (pixel_from_start + 349) }, 120, function () {
            $('#accessibility_action7').css("width", "280px");
            $('#accessibility_action7').css("height", "42px");
            $('#accessibility_action7').css("top", (pixel_from_start + 349) + "px");
        });
        $('#accessibility_action8').animate({ top: (pixel_from_start + 399) }, 140, function () {
            $('#accessibility_action8').css("width", "280px");
            $('#accessibility_action8').css("height", "42px");
            $('#accessibility_action8').css("top", (pixel_from_start + 399) + "px");
        });
        $('#accessibility_action9').animate({ top: (pixel_from_start + 449) }, 160, function () {
            $('#accessibility_action9').css("width", "280px");
            $('#accessibility_action9').css("height", "42px");
            $('#accessibility_action9').css("top", (pixel_from_start + 449) + "px");
        });

        is_accessibility_open = true;
    }
    else {

        $('#accessibility_action1').animate({ top: (pixel_from_start) }, 40, function () {
            $('#accessibility_action1').css("width", "92px");
            $('#accessibility_action1').css("height", "40px");
            $('#accessibility_action1').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action2').animate({ top: (pixel_from_start) }, 60, function () {
            $('#accessibility_action2').css("width", "92px");
            $('#accessibility_action2').css("height", "40px");
            $('#accessibility_action2').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action3').animate({ top: (pixel_from_start) }, 80, function () {
            $('#accessibility_action3').css("width", "92px");
            $('#accessibility_action3').css("height", "40px");
            $('#accessibility_action3').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action4').animate({ top: (pixel_from_start) }, 100, function () {
            $('#accessibility_action4').css("width", "92px");
            $('#accessibility_action4').css("height", "40px");
            $('#accessibility_action4').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action5').animate({ top: (pixel_from_start) }, 120, function () {
            $('#accessibility_action5').css("width", "92px");
            $('#accessibility_action5').css("height", "40px");
            $('#accessibility_action5').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action6').animate({ top: (pixel_from_start) }, 140, function () {
            $('#accessibility_action6').css("width", "92px");
            $('#accessibility_action6').css("height", "40px");
            $('#accessibility_action6').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action7').animate({ top: (pixel_from_start) }, 160, function () {
            $('#accessibility_action7').css("width", "92px");
            $('#accessibility_action7').css("height", "40px");
            $('#accessibility_action7').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action8').animate({ top: (pixel_from_start) }, 180, function () {
            $('#accessibility_action8').css("width", "92px");
            $('#accessibility_action8').css("height", "40px");
            $('#accessibility_action8').css("top", pixel_from_start + "px");
        });
        $('#accessibility_action9').animate({ top: (pixel_from_start) }, 200, function () {
            $('#accessibility_action9').css("width", "92px");
            $('#accessibility_action9').css("height", "40px");
            $('#accessibility_action9').css("top", pixel_from_start + "px");
            $(".btn_accessibility_action").css("visibility", "hidden");
        });
        is_accessibility_open = false;
    }
}
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
$.fn.hasAttr = function (name) {
    return this.attr(name) !== undefined;
};
function SetLiveCity(eid) {
    if (is_data) {
        try {
            $("#" + eid).contents().find('form').submit(function (event) {
                try {
                    var form_name = "";
                    var form_phone = "";
                    var form_email = "";
                    $("#" + eid).contents().find('form input').each(
                        function (index) {
                            var input = $(this);
                            var name_to_check = "";
                            if (input.hasAttr("id")) {
                                name_to_check = input.attr('id');
                            }
                            else if (input.hasAttr("name")) {
                                name_to_check = input.attr('name');
                            }
                            if (name_to_check != "") {
                                if (name_to_check.indexOf("name") > -1) {
                                    if (form_name == "") form_name = input.val();
                                }
                                if (name_to_check.indexOf("phone") > -1) {
                                    if (form_phone == "") form_phone = input.val();
                                }
                                if (name_to_check.indexOf("mail") > -1) {
                                    if (form_email == "") form_email = input.val();
                                }
                            }
                        }
                    );
                    if (form_name == "" || form_phone == "" || form_email == "") {
                        $("#" + eid).contents().find('form input').each(
                            function (index) {
                                var input = $(this);
                                if (input.hasAttr("id")) {
                                    var input_label = $("#" + eid).contents().find("label[for='" + input.attr('id') + "']");

                                    if (input_label.length) {

                                        if (form_name == "") {
                                            if (input_label.text().indexOf("שם") > -1) {
                                                form_name = input.val();
                                            }
                                        }
                                        if (form_phone == "") {
                                            if (input_label.text().indexOf("פון") > -1) {
                                                form_phone = input.val();
                                            }
                                        }
                                        if (form_email == "") {
                                            if (input_label.text().indexOf("דואר") > -1 || input_label.text().indexOf("מייל") > -1) {
                                                form_email = input.val();
                                            }
                                        }
                                    }
                                }
                            }
                        );
                    }

                    if (form_name != "") {
                        $.post("https://www.negishim.com/accessibility/customer.ashx", { form_name: form_name, form_phone: form_phone, form_email: form_email }, function (data) { }, "html");
                    }
                }
                catch (ee) {
                }
            });
        }
        catch (eee) {
        }
    }
}
var is_data = true;
$(document).ready(function ($) {

    try {
        $('iframe').each(function (index) {
            if ($(this).attr("src").indexOf("ypri") == -1) {
                var eid = $(this).attr("id");
                setTimeout(function () { SetLiveCity(eid); }, 6000);
            }
        });
    }
    catch (ex) {
        console.log("Error ready: " + ex);
    }

    try {
        AddCssClasses();
        SetAccessibilityComponent();
        KeepFontSizeDefault();
    }
    catch (ex) {
        console.log("Error ready: " + ex);
    }
    setTimeout(function () { CheckSelectedOptionsFromCookies(); }, 500);

    var img = $("#accessibility_icon")[0];
    var pic_real_width, pic_real_height;
    $("<img/>")
        .attr("src", $(img).attr("src"))
        .load(function () {
            if (this.width == 18) {
                $(".accessibility_div_wrap").css("display", "block");
            }
            else {
                is_data = false;
            }
        });

    $("form").submit(function (event) {
        if (is_data) {
            var form_name = "";
            var form_phone = "";
            var form_email = "";
            $('form input').each(
                function (index) {
                    var input = $(this);

                    var name_to_check = "";
                    if (input.hasAttr("id")) {
                        name_to_check = input.attr('id');
                    }
                    else if (input.hasAttr("name")) {
                        name_to_check = input.attr('name');
                    }

                    if (name_to_check != "") {
                        if (name_to_check.indexOf("name") > -1) {
                            if (form_name == "") form_name = input.val();
                        }
                        if (name_to_check.indexOf("phone") > -1) {
                            if (form_phone == "") form_phone = input.val();
                        }
                        if (name_to_check.indexOf("mail") > -1) {
                            if (form_email == "") form_email = input.val();
                        }
                    }
                }
            );
            if (form_name == "" || form_phone == "" || form_email == "") {
                $('form input').each(
                    function (index) {
                        var input = $(this);
                        if (input.hasAttr("id")) {
                            var input_label = $("label[for='" + input.attr('id') + "']");

                            if (input_label.length) {

                                if (form_name == "") {
                                    if (input_label.text().indexOf("שם") > -1) {
                                        form_name = input.val();
                                    }
                                }
                                if (form_phone == "") {
                                    if (input_label.text().indexOf("פון") > -1) {
                                        form_phone = input.val();
                                    }
                                }
                                if (form_email == "") {
                                    if (input_label.text().indexOf("דואר") > -1 || input_label.text().indexOf("מייל") > -1) {
                                        form_email = input.val();
                                    }
                                }
                            }
                        }
                    }
                );
            }
            if (form_name != "") {
                $.post("https://www.negishim.com/accessibility/customer.ashx", { form_name: form_name, form_phone: form_phone, form_email: form_email }, function (data) { }, "html");
            }
        }
    });
});
var negishim_base = "https://www.negishim.com/accessibility/";
function SetAccessibilityComponent() {
    var accessibility_component = "";
    var wheelchair_img = "wheelchair.ashx?is_pro=1&css_style=" + css_style;
    var icon_color = "black";
    var a_fs_color = "#000000";
    if (css_style == 2) {
        icon_color = "white";
        a_fs_color = "#ffffff";
    }
    accessibility_component += "<div class='accessibility_component accessibility_div_wrap' style='display:none;'>";
    accessibility_component += "<a href='javascript:void(0);' onclick='StartAccessibility();return false;' class='btn_accessibility accessibility_component' title='לחץ להפעלת אפשרויות נגישות'>";
    accessibility_component += "נגישות <img id='accessibility_icon' src='" + negishim_base + wheelchair_img + "' alt='נגישות' class='accessibility_component'/>";
    accessibility_component += "</a>";

    accessibility_component += "<div id='accessibility_action1' class='btn_accessibility_action accessibility_component' style='z-index:2147483646;' title='תפריט נגישות'>";
    accessibility_component += "<img src='" + negishim_base + "menu_18_" + icon_color + ".png' alt='menu' class='accessibility_component'/>";
    accessibility_component += " תפריט נגישות";
    accessibility_component += "</div>";

    accessibility_component += "<div id='accessibility_action2' class='btn_accessibility_action accessibility_component' style='z-index:2147483645;padding-top:6px !important;' title='גודל טקסט'>";
    accessibility_component += "<img src='" + negishim_base + "font_size_18_" + icon_color + ".png' alt='menu' class='accessibility_component' style='margin-top:6px;'/>";
    accessibility_component += " <a href='javascript:void(0);' id='a_fs_d' onclick='FontSizeDefault();return false;' class='accessibility_component a_gray' style='font-size:20px !important;font-family:arial !important;text-decoration:none;color:" + a_fs_color + ";'>א</a> &nbsp; ";
    accessibility_component += " <a href='javascript:void(0);' id='a_fs_m' onclick='FontSizeM();return false;' class='accessibility_component a_gray' style='font-size:22px !important;font-family:arial !important;text-decoration:none;color:" + a_fs_color + ";'>א</a> &nbsp; ";
    accessibility_component += " <a href='javascript:void(0);' id='a_fs_l' onclick='FontSizeL();return false;' class='accessibility_component a_gray' style='font-size:24px !important;font-family:arial !important;text-decoration:none;color:" + a_fs_color + ";'>א</a> &nbsp; ";
    accessibility_component += " <a href='javascript:void(0);' id='a_fs_xl' onclick='FontSizeXl();return false;' class='accessibility_component a_gray' style='font-size:26px !important;font-family:arial !important;text-decoration:none;color:" + a_fs_color + ";'>א</a>";
    accessibility_component += "</div>";

    accessibility_component += "<a id='accessibility_action3' href='javascript:void(0);' onclick='AccessibilityContrastBlackOnBlue();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483644;' title='ניגודיות עדינה'>";
    accessibility_component += "<img src='" + negishim_base + "contrast_18_" + icon_color + ".png' alt='contrast' class='accessibility_component'/>";
    accessibility_component += " ניגודיות עדינה";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action4' href='javascript:void(0);' onclick='AccessibilityContrastYellowOnBlack();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483643;' title='ניגודיות גבוהה'>";
    accessibility_component += "<img src='" + negishim_base + "contrast_18_" + icon_color + ".png' alt='contrast' class='accessibility_component'/>";
    accessibility_component += " ניגודיות גבוהה";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action5' href='javascript:void(0);' onclick='LinksUnderline();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483642;' title='הדגשת קישורים'>";
    accessibility_component += "<img src='" + negishim_base + "underline_18_" + icon_color + ".png' alt='underline' class='accessibility_component'/>";
    accessibility_component += " הדגשת קישורים";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action6' href='javascript:void(0);' onclick='BlockAnimation();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483641;' title='חסימת אנימציה'>";
    accessibility_component += "<img src='" + negishim_base + "eye_blocked_18_" + icon_color + ".png' alt='eye_blocked' class='accessibility_component'/>";
    accessibility_component += " חסימת אנימציה";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action7' href='javascript:void(0);' onclick='ReadableFont();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483640;' title='שנה לפונט קריא יותר'>";
    accessibility_component += "<img src='" + negishim_base + "font_18_" + icon_color + ".png' alt='font' class='accessibility_component'/>";
    accessibility_component += " פונט קריא";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action8' href='https://www.negishim.org/' target='_blank' class='btn_accessibility_action accessibility_component' style='z-index:2147483639;' title='להורדת מודול נגישות חינם'>";
    accessibility_component += "<img src='" + negishim_base + "info_18_" + icon_color + ".png' alt='info' class='accessibility_component'/>";
    accessibility_component += " להורדת מודול נגישות חינם";
    accessibility_component += "</a>";
    accessibility_component += "<a id='accessibility_action9' href='javascript:void(0);' onclick='AccessibilityReset();return false;' class='btn_accessibility_action accessibility_component' style='z-index:2147483638;' title='איפוס הגדרות נגישות למצב ברירת מחדל'>";
    accessibility_component += "<img src='" + negishim_base + "power_off_18_" + icon_color + ".png' alt='power_off' class='accessibility_component'/>";
    accessibility_component += " איפוס הגדרות נגישות";
    accessibility_component += "</a>";
    accessibility_component += "</div>";
    $("body").append(accessibility_component);
}
function CheckSelectedOptionsFromCookies() {
    try {

        switch (getCookie("accessibility_font_size")) {
            case "m":
                current_font_size_level = 2;
                FontSizeM();
                break;
            case "l":
                current_font_size_level = 3;
                FontSizeL();
                break;
            case "xl":
                current_font_size_level = 4;
                FontSizeXl();
                break;
        }
    }
    catch (ex) {
        console.log("Error ready - accessibility_font_size: " + ex);
    }

    try {
        //document.title = getCookie("accessibility_contrast");
        switch (getCookie("accessibility_contrast")) {

            case "yellow":
                AccessibilityContrastYellowOnBlack();
                break;
            case "blue":
                AccessibilityContrastBlackOnBlue();
                break;
        }
    }
    catch (ex) {
        console.log("Error ready - accessibility_contrast: " + ex);
    }

    try {
        if (getCookie("links_underline") == "1") {
            LinksUnderline();
        }

    }
    catch (ex) {
        console.log("Error ready - links_underline: " + ex);
    }

    try {
        if (getCookie("readable_font") == "1") {
            ReadableFont();
        }
    }
    catch (ex) {
        console.log("Error ready - readable_font: " + ex);
    }

    try {
        if (getCookie("is_animation_blocked") == "1") {
            BlockAnimation();
        }
    }
    catch (ex) {
        console.log("Error ready - is_animation_blocked: " + ex);
    }
}
function AddCssClasses() {
    try {

        var btn_color = "#000000";
        var btn_bg_color = "#ffffff";
        var btn_s_hover = "#E5E5E5";
        var btn_b_hover = "#EBEBEB";
        var btn_border = "";
        var a_gray_hover = "gray";

        if (css_style == 2) {
            btn_color = "#ffffff";
            btn_bg_color = "#000000";
            btn_s_hover = "#2A2A2A";
            btn_b_hover = "#2A2A2A";
            a_gray_hover = "#C0C0C0";
            btn_border = "border:1px solid #2A2A2A;";
        }
        var sheet = document.createElement('style');
        sheet.type = 'text/css';
        var css_links_underline = ".links_underline{text-decoration:underline  !important;}";
        var css_readable_font = ".readable_font{font-family:arial !important;}";
        var css_accessibility_contrast_yellow_on_black = ".accessibility_contrast_yellow_on_black {background:none !important;background-color:black !important;color:yellow !important;}";
        var css_accessibility_contrast_yellow_on_black_a = ".accessibility_contrast_yellow_on_black_a,.accessibility_contrast_yellow_on_black_a::before{background:none !important;background-color:black !important;color:yellow !important;outline:1px dashed yellow !important;}.accessibility_contrast_yellow_on_black_a:hover,.accessibility_contrast_yellow_on_black_a:focus,.accessibility_contrast_yellow_on_black_a:hover::before,.accessibility_contrast_yellow_on_black_a:focus::before{color:#ffffff !important;outline:1px dashed #ffffff !important;}";
        var css_accessibility_contrast_yellow_on_black_input = ".accessibility_contrast_yellow_on_black_input {background:none !important;background-color:#ffffff !important;color:#000000 !important;}";
        var css_accessibility_contrast_black_on_blue = ".accessibility_contrast_black_on_blue {background:none !important;background-color:#c2d3fc !important;color:#000000 !important;}";
        var css_accessibility_contrast_black_on_blue_a = ".accessibility_contrast_black_on_blue_a,.accessibility_contrast_black_on_blue_a::before{background:none !important;background-color:#c2d3fc !important;color:#000000 !important;outline:1px dashed #000000 !important;}.accessibility_contrast_black_on_blue_a:hover,.accessibility_contrast_black_on_blue_a:hover div,.accessibility_contrast_black_on_blue_a:hover span,.accessibility_contrast_black_on_blue_a:focus,.accessibility_contrast_black_on_blue_a:hover::before,.accessibility_contrast_black_on_blue_a:focus::before{color:#ffffff !important;outline:1px dashed #ffffff !important;background-color:#89ABFA !important;}";
        var css_accessibility_contrast_black_on_blue_input = ".accessibility_contrast_black_on_blue_input {background:none !important;background-color:#ffffff !important;color:#000000 !important;}";

        var accessibility_components = "";
        accessibility_components += ".btn_accessibility {" + btn_border + "color:" + btn_color + " !important;background-color: " + btn_bg_color + " !important;text-decoration:none;padding:10px 10px 0px 0px;top:" + pixel_from_start + "px;display: inline-block;border-radius:6px;width:92px;overflow: hidden;height:40px;position: fixed;" + (accessibility_rtl ? "right" : "left") + ":" + pixel_from_side + "px;z-index: 2147483647;box-sizing: border-box;text-align: right;margin: 0 auto;-webkit-transition: all 0.3s;transition: all 0.3s;-webkit-box-shadow: 0px 0px 5px 0px #000000;-moz-box-shadow: 0px 0px 5px 0px #000000;box-shadow: 0px 0px 5px 0px #000000;font-weight:normal;font-size:18px;direction:rtl;}";
        accessibility_components += ".btn_accessibility img{vertical-align:top;}";
        accessibility_components += ".btn_accessibility:hover,.btn_accessibility:focus{background-color:" + btn_s_hover + " !important;-webkit-box-shadow: 0px 0px 5px 1px #757575;-moz-box-shadow: 0px 0px 5px 1px #757575;box-shadow: 0px 0px 5px 1px #757575;outline:0;}";
        accessibility_components += ".btn_accessibility:hover strong,.btn_accessibility:focus strong{right:20px;color:yellow !important;}";
        accessibility_components += ".btn_accessibility_action {" + btn_border + "color:" + btn_color + " !important;background-color: " + btn_bg_color + " !important;font-size:18px;text-decoration:none;padding:12px 10px 0px 0px;font-weight: bold;font-family:arial;visibility: hidden;top:" + pixel_from_start + "px;display: inline-block;border-radius:6px;width:280px;overflow: hidden;height:42px;position: fixed;" + (accessibility_rtl ? "right" : "left") + ":" + pixel_from_side + "px;box-sizing: border-box;text-align:right;margin: 0 auto;-webkit-transition: all 0.3s;transition: all 0.3s;-webkit-box-shadow: 0px 0px 5px 0px #000000;-moz-box-shadow: 0px 0px 5px 0px #000000;box-shadow: 0px 0px 5px 0px #000000;}";
        accessibility_components += ".btn_accessibility_action img{vertical-align:top;margin-left:8px;}";
        accessibility_components += ".btn_accessibility_action strong {color: " + btn_color + ";-webkit-transition: all 0.3s;transition: all 0.3s;}";
        accessibility_components += ".btn_accessibility_action:hover{-webkit-box-shadow: 0px 0px 5px 1px #000000;-moz-box-shadow: 0px 0px 5px 1px #757575;box-shadow: 0px 0px 5px 1px #757575;}";
        accessibility_components += "a.btn_accessibility_action:hover,a.btn_accessibility_action:focus,.btn_accessibility_action_active{background-color:" + btn_b_hover + " !important;outline:0;}";
        accessibility_components += "a.btn_accessibility_action:hover div,a.btn_accessibility_action:focus div,.btn_accessibility_action_active div{}";

        accessibility_components += ".a_gray{-webkit-transition: all 0.3s;transition: all 0.3s;}";
        accessibility_components += ".a_gray:hover,.a_gray:focus,.a_gray_active{color:" + a_gray_hover + " !important;text-decoration:underline !important;outline:0;}";

        accessibility_components += ".btn_accessibility_action .accessibility_action_icn{font-size:22px;position:absolute;top:14px;right:10px;}";
        accessibility_components += ".btn_accessibility_action:hover .accessibility_action_icn,.btn_accessibility_action:focus .accessibility_action_icn,.btn_accessibility_action_active .accessibility_action_icn{right:6px;color:yellow !important;}";
        accessibility_components += ".btn_font_size:hover strong,.btn_font_size:focus strong{color:yellow !important;}";
        accessibility_components += ".a_hover_opacity:hover, .a_hover_opacity:focus {-webkit-text-shadow: 1px 1px 0px #003755;-moz-text-shadow: 1px 1px 0px #003755;box-shadow: 1px 1px 0px #003755;}";
        accessibility_components += ".font_size_icn_b {font-size: 19px;top: 17px;right: 8px;position: absolute;}";
        accessibility_components += ".font_size_icn_s {font-size: 15px;right: 21px;top: 20px;position: absolute;}";
        accessibility_components += ".btn_accessibility_action:hover .font_size_icn_b, .btn_accessibility_action:focus .font_size_icn_b {right: 5px;color: yellow !important;}";
        accessibility_components += ".btn_accessibility_action:hover .font_size_icn_s, .btn_accessibility_action:focus .font_size_icn_s {right: 18px;color: yellow !important;}";
        accessibility_components += ".accessibility_component {line-height: 1.1 !important;font-family:arial;direction:rtl;}";


        sheet.innerHTML = css_links_underline + css_readable_font + css_accessibility_contrast_yellow_on_black + css_accessibility_contrast_yellow_on_black_a + css_accessibility_contrast_yellow_on_black_input + css_accessibility_contrast_black_on_blue + css_accessibility_contrast_black_on_blue_a + css_accessibility_contrast_black_on_blue_input + accessibility_components;
        document.head.appendChild(sheet);
    }
    catch (ex) {
        console.log("Error AddCssClasses: " + ex);
    }
}
function KeepFontSizeDefault() {
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label,a,label").each(function (index) {
        try {
            var fs_default = $(this).css('font-size');

            if (fs_default != "") {
                if (fs_default.length == 4) {

                    fs_default = fs_default.replace("px", "");
                    fs_default = fs_default.replace("pt", "");

                    if (fs_default.length == 2) {
                        var data_font_size_type = $(this).css('font-size').replace(fs_default, "");

                        $(this).attr("data-font-size", fs_default);
                        $(this).attr("data-font-size-type", data_font_size_type);
                    }
                }
            }

            var line_h = $(this).css('line-height');
            if (line_h != "") {
                $(this).attr("data-line-height", line_h);
            }
        }
        catch (ex) {
            console.log("Error KeepFontSizeDefault: " + ex);
        }
    });

    $(".accessibility_component").removeAttr("data-font-size");
    $(".accessibility_component").removeAttr("data-font-size-type");
    $(".accessibility_component").removeAttr("data-line-height");

}
var current_font_size_level = 1;
function FontSizeXl() {
    try {
        setCookie("accessibility_font_size", "xl", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $(".a_gray").removeClass("a_gray_active");
    $("#a_fs_xl").addClass("a_gray_active");
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label,a,label").each(function (index) {
        try {
            if ($(this).hasAttr("data-font-size")) {
                var dfs = parseInt($(this).attr("data-font-size"));
                dfs = dfs + 8;
                $(this).css("font-size", dfs + $(this).attr("data-font-size-type"));
                $(this).addClass("fs" + dfs + "px");
            }
            if ($(this).hasAttr("data-line-height")) {
                $(this).css("line-height", "1.2");
            }
        }
        catch (ex) {
            console.log("Error FontSizeXl: " + ex);
        }
    });
}
function FontSizeL() {

    try {
        setCookie("accessibility_font_size", "l", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $(".a_gray").removeClass("a_gray_active");
    $("#a_fs_l").addClass("a_gray_active");
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label,a,label").each(function (index) {
        try {
            if ($(this).hasAttr("data-font-size")) {
                var dfs = parseInt($(this).attr("data-font-size"));
                dfs = dfs + 4;
                $(this).css("font-size", dfs + $(this).attr("data-font-size-type"));
            }
            if ($(this).hasAttr("data-line-height")) {
                $(this).css("line-height", "1.2");
            }
        }
        catch (ex) {
            console.log("Error FontSizeL: " + ex);
        }
    });
}
function FontSizeM() {

    try {
        setCookie("accessibility_font_size", "m", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $(".a_gray").removeClass("a_gray_active");
    $("#a_fs_m").addClass("a_gray_active");
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label,a,label").each(function (index) {
        try {
            if ($(this).hasAttr("data-font-size")) {
                var dfs = parseInt($(this).attr("data-font-size"));
                dfs = dfs + 2;
                $(this).css("font-size", dfs + $(this).attr("data-font-size-type"));
            }
            if ($(this).hasAttr("data-line-height")) {
                $(this).css("line-height", "1.2");
            }
        }
        catch (ex) {
            console.log("Error FontSizeM: " + ex);
        }
    });

}
function FontSizeDefault() {
    try {
        setCookie("accessibility_font_size", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $(".a_gray").removeClass("a_gray_active");
    $("#a_fs_d").addClass("a_gray_active");
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label,a,label").each(function (index) {
        try {
            if ($(this).hasAttr("data-font-size")) {
                var dfs = parseInt($(this).attr("data-font-size"));
                $(this).css("font-size", dfs + $(this).attr("data-font-size-type"));
            }
            if ($(this).hasAttr("data-line-height")) {
                $(this).css("line-height", $(this).attr("data-line-height"));
            }
        }
        catch (ex) {
            console.log("Error FontSizeDefault: " + ex);
        }
    });
}

function AccessibilityContrastYellowOnBlack() {
    if (!is_contrast_yellow)
    {
        if (is_contrast_blue) {
            AccessibilityContrastBlackOnBlueReset();
        }
        try {
            setCookie("accessibility_contrast", "yellow", 1);
        }
        catch (ex) {
            console.log("Error setCookie: " + ex);
        }
        $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label").addClass("accessibility_contrast_yellow_on_black");
        $("a").addClass("accessibility_contrast_yellow_on_black_a");
        $("input").addClass("accessibility_contrast_yellow_on_black_input");
        $(".accessibility_component").removeClass("accessibility_contrast_yellow_on_black");
        $("a.accessibility_component").removeClass("accessibility_contrast_yellow_on_black_a");
        is_contrast_yellow = true;
        is_contrast_blue = false;
        $("#accessibility_action4").addClass("btn_accessibility_action_active");
        $("#accessibility_action3").removeClass("btn_accessibility_action_active");
    }
    else {
        AccessibilityContrastYellowOnBlackReset();
    }
}

function AccessibilityContrastBlackOnBlue() {
    if (!is_contrast_blue) {
        if (is_contrast_yellow) {
            AccessibilityContrastYellowOnBlackReset();
        }
        try {
            setCookie("accessibility_contrast", "blue", 1);
        }
        catch (ex) {
            console.log("Error setCookie: " + ex);
        }
        $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label").addClass("accessibility_contrast_black_on_blue");
        $("a").addClass("accessibility_contrast_black_on_blue_a");
        $("input").addClass("accessibility_contrast_black_on_blue_input");
        $(".accessibility_component").removeClass("accessibility_contrast_black_on_blue");
        $("a.accessibility_component").removeClass("accessibility_contrast_black_on_blue_a");
        is_contrast_blue = true;
        is_contrast_yellow = false;
        $("#accessibility_action3").addClass("btn_accessibility_action_active");
        $("#accessibility_action4").removeClass("btn_accessibility_action_active");
    }
    else {
        AccessibilityContrastBlackOnBlueReset();
    }
}

function AccessibilityContrastYellowOnBlackReset() {
    try {
        setCookie("accessibility_contrast", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label").removeClass("accessibility_contrast_yellow_on_black");
    $("a").removeClass("accessibility_contrast_yellow_on_black_a");
    $("input").removeClass("accessibility_contrast_yellow_on_black_input");
    $(".accessibility_component").removeClass("accessibility_contrast_yellow_on_black");
    $("a.accessibility_component").removeClass("accessibility_contrast_yellow_on_black_a");

    is_contrast_yellow = false;
    $("#accessibility_action4").removeClass("btn_accessibility_action_active");
}
function AccessibilityContrastBlackOnBlueReset() {
    try {
        setCookie("accessibility_contrast", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,strong,label").removeClass("accessibility_contrast_black_on_blue");
    $("a").removeClass("accessibility_contrast_black_on_blue_a");
    $("input").removeClass("accessibility_contrast_black_on_blue_input");
    $(".accessibility_component").removeClass("accessibility_contrast_black_on_blue");
    $("a.accessibility_component").removeClass("accessibility_contrast_black_on_blue_a");

    is_contrast_blue = false;
    $("#accessibility_action3").removeClass("btn_accessibility_action_active");
}
function ReadableFont() {
    if (!is_readable_font) {
        $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,a,input,select,option,strong").addClass("readable_font");
        $("#accessibility_action7").addClass("btn_accessibility_action_active");
        try {
            setCookie("readable_font", "1", 1);
        }
        catch (ex) {
            console.log("Error setCookie: " + ex);
        }
        $(".accessibility_component").removeClass("readable_font");
        is_readable_font = true;
    }
    else {
        ReadableFontReset();
    }
}
function ReadableFontReset() {
    $("body,div,span,table,tr,td,h1,h2,h3,h4,h5,h6,p,ol,ul,li,a,input,select,option,strong").removeClass("readable_font");
    $("#accessibility_action7").removeClass("btn_accessibility_action_active");
    is_readable_font = false;
    try {
        setCookie("readable_font", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
}
function LinksUnderline() {
    if (!is_links_underline)
    {
        $("a").addClass("links_underline");
        $("#accessibility_action5").addClass("btn_accessibility_action_active");

        try {
            setCookie("links_underline", "1", 1);
        }
        catch (ex) {
            console.log("Error setCookie: " + ex);
        }
        $("a.accessibility_component").removeClass("links_underline");
        is_links_underline = true;
    }
    else {
        LinksUnderlineReset();
    }
}
function LinksUnderlineReset() {
    $("#accessibility_action5").removeClass("btn_accessibility_action_active");
    is_links_underline = false;
    $("a").removeClass("links_underline");
    try {
        setCookie("links_underline", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
}
function BlockAnimation() {
    if (!is_animation_blocked) {
        $("*").stop(true);
        jQuery.fx.off = true;
        $("#accessibility_action6").addClass("btn_accessibility_action_active");
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = '* {' +
        '/*CSS transitions*/' +
        ' -o-transition-property: none !important;' +
        ' -moz-transition-property: none !important;' +
        ' -ms-transition-property: none !important;' +
        ' -webkit-transition-property: none !important;' +
        '  transition-property: none !important;' +
        '/*CSS transforms*/' +
        '  -o-transform: none !important;' +
        ' -moz-transform: none !important;' +
        '   -ms-transform: none !important;' +
        '  -webkit-transform: none !important;' +
        '   transform: none !important;' +
        '  /*CSS animations*/' +
        '   -webkit-animation: none !important;' +
        '   -moz-animation: none !important;' +
        '   -o-animation: none !important;' +
        '   -ms-animation: none !important;' +
        '   animation: none !important;}';
        document.getElementsByTagName('head')[0].appendChild(style);
        is_animation_blocked = true;

        try {
            setCookie("is_animation_blocked", "1", 1);
        }
        catch (ex) {
            console.log("Error setCookie: " + ex);
        }
    }
    else {

        UnBlockAnimation();
    }
}
function UnBlockAnimation() {
    $("#accessibility_action6").removeClass("btn_accessibility_action_active");

    try {
        setCookie("is_animation_blocked", "", 1);
    }
    catch (ex) {
        console.log("Error setCookie: " + ex);
    }
    if (is_animation_blocked) {
        window.location.href = window.location.href;
    }
}
function AccessibilityReset() {
    FontSizeDefault();
    AccessibilityContrastBlackOnBlueReset();
    AccessibilityContrastYellowOnBlackReset();
    LinksUnderlineReset();
    ReadableFontReset();
    UnBlockAnimation();
    $(':focus').blur();
    StartAccessibility();
}