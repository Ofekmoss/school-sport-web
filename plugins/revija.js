(function($){
	"use strict";

	$(function(){

		// ie9 placeholder

		if($('html').hasClass('ie9')) {
			$('input[placeholder]').each(function(){
				$(this).val($(this).attr('placeholder'));
				var v = $(this).val();
				$(this).on('focus',function(){
					if($(this).val() === v){
						$(this).val("");
					}
				}).on("blur",function(){
					if($(this).val() == ""){
						$(this).val(v);
					}
				});
			});
			
		}

		// remove products from shopping cart
		
		$('[role="banner"]').on('click','.close_product',function(){
			$(this).closest('li').animate({'opacity':'0'},function(){
				$(this).slideUp(500);
			});
		});


		// responsive menu

		window.rmenu = function(){

			var	nav = $('nav[role="navigation"]'),
				header = $('[role="banner"]');

			var rMenu = new Object();

			rMenu.init = function(){
				rMenu.checkWindowSize();
				$(window).on('resize',rMenu.checkWindowSize);
			}

			rMenu.checkWindowSize = function(){

				if($(window).width() < 992){
					rMenu.Activate();
				}
				else{
					rMenu.Deactivate();
				}

			}
			// add click events
			rMenu.Activate = function(){
				if($('html').hasClass('md_touch')) header.off('.touch');
				header.off('click').on('click.responsivemenu','#menu_button',rMenu.openClose);
				header.on('click.responsivemenu','.main_menu li a',rMenu.openCloseSubMenu);
				nav.find('.touch_open_sub').removeClass('touch_open_sub').children('a').removeClass('prevented');
			}
			// remove click events
			rMenu.Deactivate = function(){
				header.off('.responsivemenu');
				nav.removeAttr('style').find('li').removeClass('current_click')
				.end().find('.sub_menu_wrap').removeAttr('style').end().find('.prevented').removeClass('prevented').end()
				if($('html').hasClass('md_touch')) header.off('click').on('click.touch','.main_menu li a',rMenu.touchOpenSubMenu);
			}

			rMenu.openClose = function(){

				$(this).toggleClass('active').trigger('classChanged');
				nav.stop().slideToggle();

			}

			rMenu.openCloseSubMenu = function(e){

				var self = $(this);

				if(self.next('.sub_menu_wrap').length){
					self.parent()
						.addClass('current_click')
						.siblings()
						.removeClass('current_click')
						.children(':not(span,a)')
						.slideUp();
					self.next().stop().slideToggle();
					self.parent().siblings().children('a').removeClass('prevented');

					if(!(self.hasClass('prevented'))){
						e.preventDefault();
						self.addClass('prevented');
					}else{
						self.removeClass('prevented');
					}
				}

			}

			rMenu.touchOpenSubMenu = function(event){
				var self = $(this);

				if(self.next('.sub_menu_wrap').length){

					if(!(self.hasClass('prevented'))){
						event.preventDefault();
						self.addClass('prevented');
					}else{
						self.removeClass('prevented');
					}

				}
				
			}

			rMenu.init();
		}

		rmenu();

		/*Search_holder*/

		window.search_holder = function(){

			var searchHolder = $('.search-holder');

			if (searchHolder.length) {
				searchHolder.searchClick();
			}

		}

		search_holder();

		//===================fixed header================

		// ie9 placeholder

		if($('html').hasClass('ie9')) {
			$('input[placeholder]').each(function(){
				$(this).val($(this).attr('placeholder'));
				var v = $(this).val();
				$(this).on('focus',function(){
					if($(this).val() === v){
						$(this).val("");
					}
				}).on("blur",function(){
					if($(this).val() == ""){
						$(this).val(v);
					}
				});
			});
			
		}

		// tabs

		var tabs = $('.tabs');
		if(tabs.length){
			tabs.tabs({
				beforeActivate: function(event, ui) {
			        var hash = ui.newTab.children("li a").attr("href");
			   	},
				hide : {
					effect : "fadeOut",
					duration : 450
				},
				show : {
					effect : "fadeIn",
					duration : 450
				},
				updateHash : false
			});
		}

	    // open dropdown

		$('#sort_button').css3Animate($('#sort_button').next('.sort_list'));

		// Loader

		$("body").queryLoader2({
	        backgroundColor: '#fff',
	        barColor : '#00ADEE', //'#ff680d',
	        barHeight: 4,
	        deepSearch:true,
	        minimumTime:1000,
	        onComplete: function(){
	        	$(".loader").fadeOut('200');
	        },
            onInit: function(){
                $(".loader").fadeIn('200');
            }
      	});

	    // flexslider
		if($("#flexslider").length){
			$("#flexslider").flexslider({
				controlNav:false,
				smoothHeight:true,
				animationSpeed:1000,
				slideshow:false,
				prevText:'',
				keyboard : false,
				nextText:'',
				start:function(el){
					var slshow = el,
						thumbnails = $('.thumbnails_container').children('ul');
					slshow.find('.flex-direction-nav a').addClass('flex_nav_buttons');
					var currIndex = slshow.data('flexslider').currentSlide;
					thumbnails.children('li').eq(currIndex).addClass('active');
					thumbnails.children('li').on('click',function(){
						var self = $(this),
							index = self.index();
						self.addClass('active').siblings().removeClass('active');
						slshow.data('flexslider').flexAnimate(index);
					});
					slshow.find('.flex-prev,.flex-next').on('click',function(){
						var ci = slshow.children('.slides').children('.flex-active-slide').index();
						thumbnails.children('li').eq(ci).addClass('active').siblings().removeClass('active');
					});
				}
			});
		}

		if($('#scroll_sidebar').length) $('#scroll_sidebar').scrollSidebar();

		// Sticky and Go-top

		(function ($, window) {

			function Temp(el, options) {
				this.el = $(el);
				this.init(options);
			}

			Temp.DEFAULTS = {
				sticky: true
			}

			Temp.prototype = {
				init: function (options) {
					var base = this;
						base.window = $(window);
						base.options = $.extend({}, Temp.DEFAULTS, options);
						base.menuWrap = $('.menu_wrap');
						base.goTop = $('<button class="go-to-top" id="go-to-top"></button>').appendTo(base.el);

					// Sticky
					if (base.options.sticky) {
						base.sticky.stickySet.call(base, base.window);
					}

					// Scroll Event
					base.window.on('scroll', function (e) {
						if (base.options.sticky) {
							base.sticky.stickyInit.call(base, e.currentTarget);
						}
						base.gotoTop.scrollHandler.call(base, e.currentTarget);
					});

					// Click Handler Button GotoTop
					base.gotoTop.clickHandler(base);
				},
				sticky: {
					stickySet: function () {
						var menuWrap = this.menuWrap, offset;
						if (menuWrap.length) {
							offset = menuWrap.offset().top;
							$.data(menuWrap, 'data', {
								offset: offset,
								height: menuWrap.outerHeight(true)
							});
							this.spacer = $('<div/>', { 'class': 'spacer' }).insertBefore(menuWrap);
						}
					},
					stickyInit: function (win) {
						var base = this, data;
						if (base.menuWrap.length) {
							data = $.data(base.menuWrap, 'data');
							base.sticky.stickyAction(data, win, base);
						}
					},
					stickyAction: function (data, win, base) {
						var scrollTop = $(win).scrollTop();
						if (scrollTop > data.offset) {
							base.spacer.css({ height: data.height });
							if (!base.menuWrap.hasClass('sticky')) {
								base.menuWrap.addClass('sticky');
							}
						} else {
							base.spacer.css({ height: 'auto' });
							if (base.menuWrap.hasClass('sticky')) {
								base.menuWrap.removeClass('sticky');
							}
						}
					}
				},
				gotoTop: {
					scrollHandler: function (win) {
						$(win).scrollTop() > 200 ?
							this.goTop.addClass('go-top-visible'):
							this.goTop.removeClass('go-top-visible');
					},
					clickHandler: function (self) {
						self.goTop.on('click', function (e) {
							e.preventDefault();
							$('html, body').animate({ scrollTop: 0 }, 800);
						});
					}
				}
			}

			/* Temp Plugin
			 * ================================== */

			$.fn.Temp = function (option) {
				return this.each(function () {
					var $this = $(this), data = $this.data('Temp'),
						options = typeof option == 'object' && option;
					if (!data) {
						$this.data('Temp', new Temp(this, options));
					}
				});
			}

			$('body').Temp({
				sticky: true
			});

		})(jQuery, window);

		/* ---------------------------------------------------- */
        /*	SmoothScroll										*/
        /* ---------------------------------------------------- */

		try {
			$.browserSelector();
			var $html = $('html');
			if ( $html.hasClass('chrome') || $html.hasClass('ie11') || $html.hasClass('ie10') ) {
				$.smoothScroll();
			}
		} catch(err) {}

		// custom select

		$('.custom_select').each(function(){
			var list = $(this).children('ul'),
				select = $(this).find('select'),
				title = $(this).find('.select_title');
		 

			// select items to list items

			if($(this).find('[data-filter]').length){
				for(var i = 0,len = select.children('option').length;i < len;i++){
					list.append('<li data-filter="'+select.children('option').eq(i).data('filter')+'">'+select.children('option').eq(i).text()+'</li>')
				}
			}
			else{
				for(var i = 0,len = select.children('option').length;i < len;i++){
					list.append('<li>'+select.children('option').eq(i).text()+'</li>')
				}
			}
			select.hide();

			// open list
			
			title.on('click',function(){
				list.slideToggle(400);
				$(this).toggleClass('active');
			});

			// selected option

			list.on('click','li',function(){
				var val = $(this).text();
				title.text(val);
				list.slideUp(400);
				select.val(val);
				title.toggleClass('active');
			});

		});

		// jackbox

		if($(".jackbox[data-group]").length){
			jQuery(".jackbox[data-group]").jackBox("init",{
			    showInfoByDefault: false,
			    preloadGraphics: false, 
			    fullscreenScalesContent: true,
			    autoPlayVideo: false,
			    flashVideoFirst: false,
			    defaultVideoWidth: 960,
			    defaultVideoHeight: 540,
			    baseName: ".jackbox",
			    className: ".jackbox",
			    useThumbs: true,
			    thumbsStartHidden: false,
			    thumbnailWidth: 75,
			    thumbnailHeight: 50,
			    useThumbTooltips: false,
			    showPageScrollbar: false,
			    useKeyboardControls: true 
			});
		}

		// appear animation

	    function animate() {
            $("[data-appear-animation]").each(function () {

                var self = $(this);

                self.addClass("appear-animation");
                self.addClass("appear-animation-visible");
            });
        }

	    animate();

	    $(window).on('resize',animate);

		//elevate zoom

		(function(){

			if($('#thumbnails').length){
		    $('#thumbnails').owlCarousel({
		      items : 3,
	    	  stagePadding : 40,
		      margin : 10,
		      URLhashListener : false,
		      navSpeed : 800,
		      nav : true,
		      navText:false,
		      responsive : {
			      "0" : {
			       "items" : 4
			      },
			      "481" : {
			       "items" : 3
			      },
			      "769" : {
			       "items" : 3
			      },
			      "992" : {
			       "items" : 3
			      }
		      }
		    });
		   }

			if($('[data-zoom-image]').length){

				var button = $('.qv_preview [class*="button"]');

				$("#zoom_image").elevateZoom({
					gallery:'thumbnails',
					galleryActiveClass: 'active',
					zoomType: "inner",
					cursor: "crosshair",
					responsive:true,
				    zoomWindowFadeIn: 500,
					zoomWindowFadeOut: 500,
					easing:true,
					lensFadeIn: 500,
					lensFadeOut: 500
				}); 

				button.on("click", function(e){
				  var ez = $('#zoom_image').data('elevateZoom');
					$.fancybox(ez.getGalleryList());
				  	e.preventDefault();
				});

			}

		})();
    
	});

})(jQuery);