(function() {
    'use strict';

    angular
        .module('components')
        .directive('owlCarousel', OwlCarouselDirective)
        .directive('owlItem', ['$timeout', OwlItemDirective]);

    var nd = 0;
    function OwlItemDirective($timeout) {
        return {
            link: function (scope, element) {
                $timeout(function() {
                    var $owl = element.parents('#items-container').first().find('.owl-carousel');
                    var e = element.prev();
                    var position = undefined;
                    while (e.length > 0) {
                        var i = e.data('owlPosition');
                        if (i != null) {
                            position = i + 1;
                            break;
                        }
                        e = e.prev();
                    }

                    var max = 0;
                    e = element.next();
                    while (e.length > 0) {
                        var i = e.data('owlPosition');
                        if (i != null) {
                            max = i;
                            if (position === undefined) {
                                position = i;
                            }
                            e.data('owlPosition', i + 1);
                        }
                        e = e.next();
                    }

                    element.data('owlPosition', position || 0);

                    var itemClass = element.find('.owl-video').length > 0
                        ? "item"
                        : "item-video";

                    // Cannot set position out of range in add, if we want to add at the end
                    // position should be 'undefined'
                    $owl.owlCarousel('add', $('<div class="' + itemClass + '">' + element.html() + '</div>'),
                        position > max ? undefined : position);
                    $owl.owlCarousel('refresh');
                });
                element.on('$destroy', function() {
                    var position = element.data('owlPosition');
                    if (position != null) {
                        var $owl = element.parents('#items-container').first().find('.owl-carousel');
                        $owl.owlCarousel('remove', position);
                        $owl.owlCarousel('refresh');
                    }
                });
            }
        };
    }

    function OwlCarouselDirective() {
        return {
            template: '<div id="items-container" class="owl-theme">' +
                '<div class="owl-carousel">' +
                '</div>' +
                '<div id="items" style="display: none;" ng-transclude>' +
                '</div>' +
                '</div>',
            transclude: true,
            link: function(scope, element, attrs) {
                var options = {
                    rtl: attrs.rtl == null ? true : getBooleanValue(attrs.rtl),
                    autoWidth: true,
                    items: attrs.items || 3,
                    navSpeed: attrs.navSpeed || 800,
                    navigation : true,
                    nav: attrs.nav == null ? true : getBooleanValue(attrs.nav),
                    dots: attrs.dots == null ? false : getBooleanValue(attrs.dots),
                    margin: attrs.margin == null ? 12 : attrs.margin,
                    loop: attrs.loop == null ? true : getBooleanValue(attrs.loop),
                    video: attrs.video == null ? true : getBooleanValue(attrs.video),
                    navText: attrs.navText == null ? ['\uf105', '\uf104'] : getBooleanValue(attrs.navText),
                    responsive: {
                        0: {
                            items: attrs.itemsSm || 1
                        },
                        481: {
                            items: attrs.itemsMd || 2
                        },
                        980: {
                            items: attrs.itemsLg || 3
                        }
                    }
                };
                element.find('.owl-carousel').owlCarousel(options);
            }
        };
    }
})();