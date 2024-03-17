(function() {
    'use strict';

    angular
        .module('components')
        .directive('flexItem', ['$timeout', FlexItemDirective])
        .directive('flexSlider', ['$timeout', FlexSliderDirective]);

    function FlexItemDirective($timeout) {
        return {
            link: function (scope, element) {
                var $slider = element.parents('#items-container').first().find('#slider');
                var $carousel = element.parents('#items-container').first().find('#carousel');
                var sliderList =  $slider.find('ul');
                var carouselList =  $carousel.find('ul');
                $timeout(function() {
                    sliderList.append($('<li>' + element.html() + '</li>'));
                    var image = element.find('img.carousel-image');
                    if (image.length == 0) {
                        image = element.find('img');
                    }
                    if (image.length > 0) {
                        carouselList.append($('<li><img src="' + image.attr('src') + '" alt=""></li>'));
                    }
                    else {
                        carouselList.append($('<li><img src="" alt=""></li>'));
                    }

                    // removing jackbox group to prevent showing the same image twice
                    element.find('.jackbox').removeAttr('data-group');

                    var slideCount = sliderList.find('li').length;

                    $carousel.css('display',
                        $carousel.data('flexCarouselHidden') || slideCount <= 1 ? 'none' : 'block'
                    );

                    $slider.removeData("flexslider");
                    $slider.flexslider({
                        animation: "slide",
                        controlNav: false,
                        animationLoop: false,
                        directionNav: slideCount > 1,
                        animationSpeed: 1000,
                        prevText: '',
                        nextText: '',
                        slideshow: false,
                        sync: "#carousel"
                    });
                });
            }
        };
    }

    function FlexSliderDirective($timeout) {
        return {
            template: '<div id="items-container">' +
            '<div id="slider" class="flexslider">' +
            '  <ul class="slides">' +
            '  </ul>' +
            '</div>' +
            '<div id="carousel" class="flexslider">' +
            '  <ul class="slides">' +
            '  </ul>' +
            '</div>' +
            '<div id="items" style="display: none;" ng-transclude>' +
            '</div>' +
            '</div>',
            transclude: true,
            link: function(scope, element, attrs) {
                var $slider = element.find('#slider');
                var $carousel = element.find('#carousel');
                if (attrs.carousel != null && !getBooleanValue(attrs.carousel)) {
                    $carousel.data('flexCarouselHidden', true);
                    $carousel.css('display', 'none');
                }
                $timeout(function () {
                    $carousel.flexslider({
                        animation: "slide",
                        controlNav: false,
                        directionNav: false,
                        animationLoop: false,
                        slideshow: false,
                        prevText:'',
                        nextText:'',
                        itemWidth: 100,
                        asNavFor: '#slider'
                    });

                    $slider.flexslider({
                        animation: "slide",
                        controlNav: false,
                        animationLoop: false,
                        directionNav: false,
                        animationSpeed: 1000,
                        prevText: '',
                        nextText: '',
                        slideshow: false,
                        sync: "#carousel"
                    });
                });
            }
        };
    }
})();