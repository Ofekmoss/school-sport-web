var sportCustomizeMethods = {
    AccessibilityComponent: {
        Customize: function() {
            var accessibilityLink = $(".accessibility_component .btn_accessibility");
            if (accessibilityLink.length == 1) {
                if (accessibilityLink.text().length > 0) {
                    var oImage = accessibilityLink.find("img");
                    accessibilityLink.text("");
                    accessibilityLink.append(oImage);
                }
                var totalHeight = $(window).height();
                accessibilityLink.css({"width": "40px", "top": (totalHeight - 60) + "px"});
            }
        }
    },
    OwlCarousel: {
        SetArrowLocation: function(arrowElement, top, right, left) {
            var styles = [];
            if (top != null && !isNaN(top))
                styles.push('top: ' + top + 'px !important;');
            if (right != null && !isNaN(right))
                styles.push('right: ' + right + 'px !important;');
            if (left != null && !isNaN(left))
                styles.push('left: ' + left + 'px !important;');
            if (styles.length > 0)
                arrowElement.css("cssText", styles.join(" "));
            return styles;
        },
        SetArrowDisplay: function(arrowElement, existingStyles, displayValue) {
            var newStyles = existingStyles.slice(0);
            newStyles.push('display: ' + displayValue + ' !important;');
            arrowElement.css("cssText", newStyles.join(" "));
        },
        Customize: function() {
            $("owl-carousel").each(function() {
                var carousel = $(this);
                if (carousel.data('handled') != '1') {
                    var arrowPrev = carousel.find('.owl-prev');
                    var arrowNext = carousel.find('.owl-next');
                    var arrowsTop = parseInt(carousel.data('arrows-top'));
                    var arrowRight = parseInt(carousel.data('arrow-right'));
                    var arrowLeft = parseInt(carousel.data('arrow-left'));
                    var prevArrowStyles = sportCustomizeMethods.OwlCarousel.SetArrowLocation(arrowPrev, arrowsTop, arrowRight, null);
                    var nextArrowStyles = sportCustomizeMethods.OwlCarousel.SetArrowLocation(arrowNext, arrowsTop, null, arrowLeft);
                    carousel.bind("mouseover", function() {
                        sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowPrev, prevArrowStyles, 'block');
                        sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowNext, nextArrowStyles, 'block');
                        if (carousel.mouseOutTimer) {
                            window.clearTimeout(carousel.mouseOutTimer);
                        }
                    }).bind("mouseout", function() {
                        if (carousel.mouseOutTimer)
                            window.clearTimeout(carousel.mouseOutTimer);
                        carousel.mouseOutTimer = window.setTimeout(function() {
                            sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowPrev, prevArrowStyles, 'none');
                            sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowNext, nextArrowStyles, 'none');
                        }, 500);
                    });
                    carousel.data('handled', '1');
                }
            });
        }
    },
    TeamPunch: {
        Mobile: {
            Customize: function() {
                var bannerContainer = $(".tp-banner-container");
                if (bannerContainer.length > 0) {
                    var revCaption = bannerContainer.find(".rev_caption");
                    revCaption.css("margin-right", "15px");
                    revCaption.find("p").css("font-size", "12px");
                    bannerContainer.find(".event_date").css("margin-bottom", "10px");
                }
            }
        }
    },
    TopMenu: {
        Customize: function(bodyWidth, mobileScreen) {
            function ApplyMobileMenu() {
                var menuId = "schoolSportSideNav";
                var oMobileMenu = $("#" + menuId);
                var subMenuCounter = 0;
                var toggleSign = $("<i></i>").addClass("fa").addClass("fa-plus-square-o").css("margin-left", "5px");
                var createSubMenuPanel = function(subMenu, oLink, additionalClass) {
                    if (typeof additionalClass == "undefined" || additionalClass == null)
                        additionalClass = "";
                    subMenuCounter++;
                    var subMenuId = menuId + "_" + subMenuCounter;
                    oLink.data("menu-id", subMenuId);
                    oLink.attr("href", "javascript:void(0)");
                    oLink.attr("onclick", "OpenSubMenu(this);");
                    oLink.prepend(toggleSign.clone());
                    var subMenuPanel = $("<div></div>");
                    subMenuPanel.addClass("sub-menu");
                    if (additionalClass.length > 0)
                        subMenuPanel.addClass(additionalClass);
                    subMenuPanel.attr("id", subMenuId);
                    var subMenuItems = subMenu.find("> ul > li");
                    subMenuItems.each(function() {
                        var currentSubMenuItem = $(this);
                        var currentSubMenuLink = currentSubMenuItem.find("> a").first();
                        if (currentSubMenuLink.length == 1) {
                            var subMenuLevel2 = currentSubMenuItem.find("> .sub_menu_inner");
                            var subMenuLevel2_Panel = null;
                            if (subMenuLevel2.length == 1) {
                                subMenuLevel2_Panel = createSubMenuPanel(subMenuLevel2, currentSubMenuLink, "sub-menu-level2");
                            } else {
                                currentSubMenuLink.bind("click", closeNav);
                            }
                            subMenuPanel.append(currentSubMenuLink);
                            if (subMenuLevel2_Panel != null)
                                subMenuPanel.append(subMenuLevel2_Panel);
                        }
                    });
                    return subMenuPanel;
                }

                $(".main_menu>ul>li").each(function() {
                    var oItem = $(this);
                    var oLink = oItem.find("a").first();
                    oLink.find("i").remove();
                    var subMenu = oItem.find("> .sub_menu_wrap");
                    var subMenuPanel = null;
                    if (subMenu.length == 1) {
                        subMenuPanel = createSubMenuPanel(subMenu, oLink);
                    } else {
                        oLink.bind("click", closeNav);
                    }
                    oMobileMenu.append(oLink);
                    if (subMenuPanel != null)
                        oMobileMenu.append(subMenuPanel);

                });
            }

            function AdjustForMobile(pnlMainMenu, lnkHome) {
                console.log('mobile screen detected');
                window['qL_Finish_Now'] = true;
                window.setInterval(function () {
                    $(".accessibility_div_wrap").hide();
                }, 1000);
                window.setTimeout(function() {
                    $(window).scrollTop(0);
                }, 2000);
                $(".main_menu > ul > li > a").css({
                    "background-color": "transparent",
                    "border-color": "transparent",
                    "line-height": "auto",
                    width: "100%",
                    "text-align": "right"
                });
                $(".main_menu > ul > li > a > br").replaceWith("<span>&nbsp;</span>");
                ApplyMobileMenu();

                /*
                $('head').append("<style>#menu_button:after {color: #383e44; font-size: 30px; </style>");
                $('body').css('margin-top', '70px');
                var mainMenuList = pnlMainMenu.children("ul").first();
                pnlMainMenu.css("width", Math.floor(0.9 * bodyWidth) + "px");
                lnkHome.parents(".row").first().children("div").removeClass();
                if (bodyWidth < 345) {
                    var diff = 345 - bodyWidth;
                    lnkHome.find("img").css("width", (240 - diff) + "px");
                }
                lnkHome.css("margin-left", "60px");
                lnkHome.find("img").css({
                    "height": "65px",
                    "float": "right"
                });
                $(".main_menu > ul > li > a").css({
                    "background-color": "transparent",
                    "border-color": "transparent",
                    "line-height": "auto",
                    width: "100%",
                    "text-align": "right"
                });
                $(".main_menu > ul > li > a > br").replaceWith("<span>&nbsp;</span>");
                ApplyMobileMenu();
                $("header").css("position", "fixed");
                pnlMainMenu.find("a").bind("click", function () {
                    var clickedLink = $(this);
                    var linkHref = clickedLink.attr("href");
                    if (linkHref && linkHref.length > 0 && linkHref != '#') {
                        window.setTimeout(function () {
                            window.location.reload(false);
                        }, 200);
                    }
                });
                sportUtils.DoWhenReady(".login_block", function (loginBlock) {
                    loginBlock.find(".top_menu_button:visible").slice(1).each(function () {
                        $(this).appendTo("<li></li>").appendTo(mainMenuList);
                    });
                    loginBlock.hide();
                });
                sportUtils.DoWhenReady(".h_top_part", function (topPart) {
                    topPart.hide();
                });
                sportUtils.DoWhenReady("#pnlLogin", function (loginPanel) {
                    var totalWidth = $("body").width();
                    loginPanel.css({"right": "-60px", "left": "", "width": totalWidth + "px"});
                });
                sportUtils.CssWhenReady("#pnlTopHeaderLogoContainer", "float", "left");
                sportUtils.CssWhenReady("#pnlTopHeaderMenuContainer", {"float": "right", "margin-right": "10px", "margin-top": "0px"});
                sportUtils.CssWhenReady("#imgTopHeaderLogo", "height", "50px");
                sportUtils.CssWhenReady("#MenuContainer", "left", "0px");
                sportUtils.CssWhenReady(".menu_wrap", "height", "40px");
                sportUtils.CssWhenReady(".wrapper_container", "margin-top", "40px");
                var userLoggedIn = false;
                var userLoginItem = null;
                var mangerToolsItem = null;
                var loggedInUserName = "";
                sportUtils.DoWhenReady("#lbLoggedInUserName", function (loggedInUserLabel) {
                    loggedInUserName = loggedInUserLabel.text().trim();
                    userLoggedIn = loggedInUserName.length > 0;
                    loggedInUserLabel.text("");
                    sportUtils.DoWhenReady("#liManagerTools", function (element) {
                        mangerToolsItem = element;
                        sportUtils.DoWhenReady("#mobileHeaderPlaceholder_2", function (placeholder) {
                            placeholder.replaceWith(mangerToolsItem);
                        });
                        if (userLoggedIn) {
                            mangerToolsItem.show();
                            mangerToolsItem.find("a").find("span").text("");
                            mangerToolsItem.find("i").css("color", "black");
                            mangerToolsItem.css({
                                "list-style-type": "none",
                                "font-size": "30px",
                                "position": "absolute",
                                "right": "60px",
                                "top": "20px"
                            });
                        }
                    });
                });
                sportUtils.DoWhenReady("#liUserLogin", function (element) {
                    userLoginItem = element;
                    sportUtils.DoWhenReady("#mobileHeaderPlaceholder_1", function (placeholder) {
                        placeholder.replaceWith(userLoginItem);
                    });
                    var userNameSpan = userLoginItem.find("a").find("span");
                    if (loggedInUserName.length == 0) {
                        var overrideValue = userNameSpan.text().trim();
                        if (overrideValue.length > 0)
                            loggedInUserName = overrideValue;
                    }
                    userNameSpan.text("");
                    sportUtils.DoWhenReady("#lbAboveLogOffButton", function (label) {
                        label.text(loggedInUserName);
                    });
                    userLoginItem.find("i").css("color", "black");
                    userLoginItem.css({
                        "list-style-type": "none",
                        "font-size": "30px",
                        "position": "absolute",
                        "right": "25px",
                        "top": "20px"
                    });
                });
                */
            }

            function ResizeMenu(pnlMainMenu, lnkHome) {
                var menuWidth = pnlMainMenu.width();
                if ((menuWidth + lnkHome.width()) > bodyWidth && lnkHome.position().left < 0)
                    lnkHome.parents("div").first().css("width", "100%");
                if (bodyWidth && menuWidth > bodyWidth) {
                    console.log("menu resize");
                    $("#MenuContainer").css("left", "0%")
                    var sanityCheck = 0;
                    while (sanityCheck <= 20) {
                        var totalWidth = 0;
                        $(".main_menu > ul > li > a").each(function () {
                            var curLink = $(this);
                            var currentWidth = parseInt(curLink.css("width"));
                            if (!isNaN(currentWidth) && currentWidth >= 70) {
                                currentWidth -= 3;
                                curLink.css("width", currentWidth + "px");
                                totalWidth += currentWidth + 12;
                            }
                        });
                        if (totalWidth < bodyWidth)
                            break;
                        sanityCheck++;
                    }
                }
            }

            if (mobileScreen)
                $(".top_menu_button > .popup").css({"right": "0px", "left": "0px"});
            var pnlMainMenu = $(".main_menu");
            if (pnlMainMenu.length == 1) {
                var lnkHome = $("#lnkHome");
                var oFrame = $("#GoogleMapsFrame");
                if (mobileScreen) {
                    oFrame.hide();
                    AdjustForMobile(pnlMainMenu, lnkHome);
                } else {
                    oFrame.attr("src", oFrame.data("src"));
                    ResizeMenu(pnlMainMenu, lnkHome);
                }
                return;
            }
            window.setTimeout(function() {
                sportCustomizeMethods.TopMenu.Customize(bodyWidth, mobileScreen);
            }, 100);
        }
    },
    ScreenSize: {
        Customize: function() {
            var body = $("body");
            if (body.length == 1) {
                var bodyWidth = $("body").width();
                if (bodyWidth > 0) {
                    var mobileScreen = sportUtils.IsMobile(); //bodyWidth <= 992;
                    if (mobileScreen) {
                        window.setInterval(sportCustomizeMethods.TeamPunch.Mobile.Customize, 1500);
                    }
                    window.setTimeout(function() {
                        sportCustomizeMethods.TopMenu.Customize(bodyWidth, mobileScreen);
                    }, 100);
                    return;
                }
            }
            window.setTimeout(sportCustomizeMethods.ScreenSize.Customize, 100);
        }
    }
};

window.setInterval(sportCustomizeMethods.AccessibilityComponent.Customize, 1000);
window.setInterval(sportCustomizeMethods.OwlCarousel.Customize, 1000);
window.setTimeout(sportCustomizeMethods.ScreenSize.Customize, 100);