(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentListController',
            ['$scope', '$state', '$stateParams', '$sce', '$http', 'ContentService', ContentListController]);

    function ContentListController($scope, $state, $stateParams, $sce, $http, ContentService) {
        var pagesPerRow = 3;
        $scope.pageRows = null;
        $scope.pageType = $state.current.data.contentType;
        $scope.pluralCaption = contentUtils.HebrewPageType($scope.pageType, true);
        $scope.data = {'AllTags': []};

        function ReadPages() {
            function BuildRowPages(pageRow) {
                pageRow.Pages = [];
                for (var i = 0; i < pageRow.length; i++) {
                    var curPage = pageRow[i];
                    curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                    curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
                    pageRow.Pages.push(curPage);
                }

                //insert empty pages
                for (var i = pageRow.length; i < pagesPerRow; i++) {
                    pageRow.Pages.push({
                        'Seq': 0
                    });
                }
            }

            var actualType = contentUtils.ParsePageType($scope.pageType);
            ContentService.list(actualType, null).then(function (contentPages) {
                contentUtils.InitCroppedImages($http, function() {
                    for (var i = 0; i < contentPages.length; i++) {
                        var curPage = contentPages[i];
                        contentUtils.BuildCroppedImages(curPage);
                    }
                });
                $scope.pageRows = sportUtils.SplitArray(contentPages, pagesPerRow);
                for (var i = 0; i < $scope.pageRows.length; i++) {
                    var currentRow = $scope.pageRows[i];
                    BuildRowPages(currentRow);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function (err) {
                alert('שגיאה בעת טעינת נתונים מהשרת');
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllTags() {
            $scope.data.AllTags = [];
            window.setTimeout(function() {
                window['qL_Finish_Now'] = true;
            }, 1000);
            ChainFactory.Next();
            /*
            $http.get('/api/common/tags?type=1').then(function(resp) {
                $scope.data.AllTags = resp.data;
                window.setTimeout(function() {
                    window['qL_Finish_Now'] = true;
                }, 1000);
                ChainFactory.Next();
            }, function(err) {
                alert('error loading tags: ' + err);
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            });
            */
        }

        ChainFactory.Execute(ReadPages, ReadAllTags);

        window['qL_steps_amount'] = 2;
    }
})();