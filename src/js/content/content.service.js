(function() {
    'use strict';

    angular
        .module('sport.content')
        .factory('ContentService',
        ['$http', '$httpParamSerializer', ContentService]);

    function ContentService($http, $httpParamSerializer) {
        function onRead(contentPage) {
            contentPage.Date = new Date(contentPage.Date);
        }

        function onWrite(contentPage) {

        }

        return {
            list: function (type, recent, includeHidden) {
                // If type is null list all types
                // If recent has a value - list only the amount in recent
                // If both type is null and recent has a value - read the amount of recent for each type
                if (typeof includeHidden == 'undefined')
                    includeHidden = false;
                var url = '/api/pages';
                var params = $httpParamSerializer({type: type, recent: recent});
                if (params) {
                    url += '?' + params;
                }
                return $http.get(url).then(function(resp) {
                    for (var i = 0; i < resp.data.length; i++) {
                        onRead(resp.data[i]);
                    }
                    if (includeHidden) {
                        return resp.data;
                    } else {
                        return resp.data.filter(function(x) {
                            return x.IsHidden != 1;
                        });
                    }
                });
            },
            featured: function() {
                //read all pages, take only those which are featured
                return $http.get('/api/pages').then(function(resp) {
                    var featuredPages = resp.data.slice(0).filter(function(x) { return x.FeaturedIndex > 0; });
                    featuredPages.sort(function(p1, p2) { return p1.FeaturedIndex - p2.FeaturedIndex; });
                    return featuredPages.filter(function(x) {
                        return x.IsHidden != 1;
                    });
                });
            },
            recent: function(pageTypes, options) {
                //read all pages, take only those which got index, i.e. recent
                if (typeof options == 'undefined')
                    options = {};
                var amount = options.amount || sportGlobalSettings.RecentAmount;
                var sportFieldSeq = options.sportField || 0;
                var takeAll = options.takeAll || false;
                if (!pageTypes.hasOwnProperty('length'))
                    pageTypes = [pageTypes];
                var url = '/api/pages?type=0';
                if (sportFieldSeq > 0)
                    url += '&sport=' + sportFieldSeq;
                return $http.get(url).then(function (resp) {
                    var combinedPages = {};
                    var allPages = resp.data.slice(0);
                    pageTypes.forEach(function(curPageType) {
                        var recentPages = allPages.filter(function (x) {
                            return (curPageType == 0 || x.Type == curPageType) && x.IsHidden != 1;
                        });
                        if (!takeAll) {
                            recentPages = recentPages.filter(function (x) {
                                return x.PageIndex > 0
                            });
                        }
                        recentPages = recentPages.take(amount);
                        for (var i = 0; i < recentPages.length; i++) {
                            onRead(recentPages[i]);
                        }
                        recentPages.sort(function (p1, p2) {
                            return takeAll ? p2.Date.getTime() - p1.Date.getTime() : p1.PageIndex - p2.PageIndex;
                        });
                        combinedPages['Type_' + curPageType] = recentPages;
                    });
                    return combinedPages;
                });
            },
            championship: function (championshipCategoryId) {
                var url = '/api/pages/championship/' + championshipCategoryId;
                return $http.get(url).then(function(resp) {
                    for (var i = 0; i < resp.data.length; i++) {
                        onRead(resp.data[i]);
                    }
                    return resp.data;
                });
            },
            create: function (contentPage) {
                onWrite(contentPage);
                return $http.post('/api/pages', {page: contentPage}).then(function (resp) {
                    return resp.data;
                });
            },
            read: function (contentPageSeq) {
                return $http.get('/api/pages/' + contentPageSeq).then(function(resp) {
                    onRead(resp.data);
                    return resp.data;
                });
            },
            update: function (contentPage) {
                onWrite(contentPage);
                return $http.put('/api/pages', {pageData: contentPage}).then(function (resp) {
                    return resp.data;
                });
            },
            delete: function (contentPageSeq) {
                return $http.delete('/api/pages/' + contentPageSeq);
            },
            setFeaturedPages: function(contentPages) {
                return $http.post('/api/pages/featured', {pages: contentPages});
            },
            setRecentPages: function(contentPages, pageType) {
                return $http.post('/api/pages/recent', {pages: contentPages, type: pageType});
            },
            removeRecentPage: function(contentPageSeq) {
                return $http.delete('/api/pages/recent?page=' + contentPageSeq);
            },
            hide: function(contentPageSeq) {
                return $http.put('/api/pages/' + contentPageSeq + '/hide', {});
            },
            unhide: function(contentPageSeq) {
                return $http.put('/api/pages/' + contentPageSeq + '/unhide', {});
            }
        };
    }
})();