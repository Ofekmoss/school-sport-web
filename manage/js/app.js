/**
 * Created by yahav on 19/03/2019.
 */
function foo() {
    alert('hello world');
}

(function() {
    'use strict';
    angular
        .module('manage', ['ui.bootstrap', 'ui.router'])
        .config(['$urlRouterProvider', function ($urlRouterProvider) {
            $urlRouterProvider.otherwise('/home');
        }])
        .config( [
            '$compileProvider',
            function( $compileProvider )
            {
                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|waze|chrome-extension):/);
            }
        ])
        .controller('ManageMainCtrl', ['$scope', '$http', '$q', '$timeout', '$interval', '$state', '$rootScope', '$filter', ManageMainCtrl])
        .filter('reverse', function() {
            return function(items) {
                return items.slice().reverse();
            };
        })
        .filter('isNull', function() {
            return function(value, defaultValue) {
                return ((typeof value == 'undefined') || value == null) ? defaultValue : value;
            };
        })
        .filter('formatDateTime', ['$filter', function ($filter) {
            return function(rawDate, format) {
                //2017-11-01T13:00:56.000Z
                return MirHelpers.formatDateTime($filter, rawDate, format);
            };
        }]);

    var _allSchoolTeamsRows = [];
    function SchoolTeamsFilteredRows($scope, $filter) {
        var searchTerm = $.trim($scope.data.SchoolTeamsTable.Search);
        var filtered =  _allSchoolTeamsRows.slice(0);
        if (searchTerm.length > 0)
            filtered = $filter('filter')(filtered, searchTerm);
        filtered = MirTable.applyFilters($scope.data.SchoolTeamsTable.Fields, filtered);
        if ($scope.data.SchoolTeamsTable.Sort != null) {
            var sortColumn = $scope.data.SchoolTeamsTable.Sort.Column || '';
            if (sortColumn.length > 0) {
                MirTable.sort(filtered, sortColumn, $scope.data.SchoolTeamsTable.Fields, $scope.data.SchoolTeamsTable.Sort.Descending);
            }
        }
        return filtered;
    }

    function LoadSchoolTeamsTable($timeout, $http, $scope, $filter, schoolSymbol) {
        //wait for table to load first
        if ($("#tblSchoolTeams").length == 0) {
            $timeout(function() {
                LoadSchoolTeamsTable($timeout, $http, $scope, $filter, schoolSymbol);
            }, 50);
            return;
        }
        var fieldNames = ['ענף', 'אליפות', 'קטגוריה', 'קבוצה', 'מאמן', 'מתקן', 'ימי פעילות', 'שעות', 'עלות'];
        $scope.data.SchoolTeamsError = '';
        $scope.data.SchoolTeamsTable = MirTable.createNew(fieldNames, 'ענף');
        $scope.data.SchoolTeamsTable.Features = MirTable.parseFeatures('tblSchoolTeams');
        if (!$scope.data.SchoolTeamsTable.Features.Sort) {
            $scope.data.SchoolTeamsTable.Sort = null;
            $timeout(function() {
                $("#tblSchoolTeams").find("th").css("cursor", "default");
            }, 100);
        }
        var pageSize = $scope.data.SchoolTeamsTable.Features.Paging ? 20 : 99999;
        $scope.schoolTeamsPagingService = new PagingService(SchoolTeamsFilteredRows($scope, $filter), {pageSize: pageSize});
        $scope.data.SchoolTeamsTable.Rows = [];
        $scope.schoolTeamsPagingService.applyPaging($scope.data.SchoolTeamsTable.Rows);
        var url = '/api/sportsman/school/' + schoolSymbol + '/teams';
        _allSchoolTeamsRows = [];
        $scope.data.LoadingSchoolTeams = true;
        $http.get(url).then(function(resp) {
            $scope.data.LoadingSchoolTeams = false;
            if (resp.data) {
                $scope.data.SchoolTeamsTable.TotalRows = resp.data.length;
                for (var i = 0; i < resp.data.length; i++) {
                    var teamRow = resp.data[i];
                    _allSchoolTeamsRows.push({
                        'ענף': teamRow.SPORT_NAME,
                        'אליפות': teamRow.CHAMPIONSHIP_NAME,
                        'קטגוריה': teamRow.CATEGORY_NAME,
                        'קבוצה': MirHelpers.GetHebrewLetter(teamRow.TEAM_INDEX, "א'"),
                        'מאמן': '',
                        'מתקן': '',
                        'ימי פעילות': '',
                        'שעות': '',
                        'עלות': ''
                    });
                }
                $scope.schoolTeamsPagingService.setData(SchoolTeamsFilteredRows($scope, $filter));
                MirTable.initAvailableColumnsPicker('btnChooseTableColumns', 'pnlAvailableColumns', 'available-columns-title');
            } else {
                $scope.data.SchoolTeamsTable.TotalRows = 0;
            }
        }, function(err) {
            $scope.data.LoadingSchoolTeams = false;
            $scope.data.SchoolTeamsError = 'שגיאה בעת טעינת נתונים, נא לנסות שוב מאוחר יותר';
        });
        $scope.data.SchoolTeamsTable.OnDataChange = function() {
            $scope.schoolTeamsPagingService.setData(SchoolTeamsFilteredRows($scope, $filter));
        };
        $scope.data.SchoolTeamsTable.SendPostData = function(url, requestParams, successCallback, failureCallback) {
            MirTable.sendPostData($http, url, requestParams, successCallback, failureCallback);
        };
        $scope.$watch('data.SchoolTeamsTable.Search', function (newval){
            if ($scope.schoolTeamsPagingService && _allSchoolTeamsRows.length > 0) {
                $scope.schoolTeamsPagingService.setData(SchoolTeamsFilteredRows($scope, $filter));
            }
        });
    }

    function AddNewTeam(rawHTML, $http, schoolSymbol) {
        var oContainer = $(rawHTML);
        var ddlSportFields = oContainer.find(".sport-fields-list");
        var ddlGrades = oContainer.find(".grades-list");
        var url = '/api/sportsman/championships?schoolSymbol=' + schoolSymbol;
        $http.get(url).then(function(resp) {
            var allCategories = resp.data.slice(0);
            var sportFields = MirHelpers.distinctArray(allCategories.map(function(x) {
                return {
                    Seq: x.SPORT_ID,
                    Name: x.SPORT_NAME
                };
            }) ,'Name');
            sportFields.forEach(function(sportField) {
                ddlSportFields.append(MirHelpers.CreateNewOption(sportField.Seq, sportField.Name));
            });
            var sportFieldMapping = allCategories.mapByProperty('SPORT_ID');
            MirHelpers.alignFormItems('.mir-dialog-body');
            MirDialog.Show('רישום קבוצה', oContainer[0].outerHTML);
            MirDialog.AttachEvent('.teams-amount-list', 'change', function(e) {
                var teamsAmount = e.target.value || 1;
                var allPanels = MirDialog.GetItems(".team-details-panel");
                allPanels.hide();
                for (var i = 0; i < teamsAmount; i++) {
                    allPanels.eq(i).show();
                }
            });
            MirDialog.AttachEvent('.grades-list', 'change', function(e) {
                var selectedSportFieldSeq = MirDialog.GetItems('.sport-fields-list').val();
                var toggleSelectionContainer = MirDialog.GetItems(".mir-toggle-selection-container").first();
                toggleSelectionContainer.find("div").show();
                MirDialog.GetItems(".mir-toggle-selection-container div").removeClass("mir-selected-toggle-item");
                var genders = MirHelpers.extractCategoryItems(selectedSportFieldSeq, sportFieldMapping, 1);
                if (genders.length == 1) {
                    var existingGender = genders[0] == 'תלמידות' || genders[0] == 'בנות' ? 2 : 1;
                    var otherGender = existingGender == 1 ? 2 : 1;
                    toggleSelectionContainer.find("div[data-gender='" + otherGender + "']").hide();
                }
            });
            MirDialog.AttachEvent('.sport-fields-list', 'change', function(e) {
                var ddlGrades = MirDialog.GetItems(".grades-list").first();
                var selectedSportFieldSeq = e.target.value || 0;
                var grades = MirHelpers.extractCategoryItems(selectedSportFieldSeq, sportFieldMapping, 0);
                MirHelpers.applyDropDownItems(ddlGrades, grades);
                MirDialog.TriggerEvent('.grades-list', 'change');
            });
            MirDialog.AttachConfirmCallback(function(e) {
                var dialogError = MirDialog.GetItems(".mir-dialog-error");
                dialogError.text("").hide();
                var selectedSportFieldSeq = MirDialog.GetItems(".sport-fields-list").val();
                var selectedGenderItem = MirDialog.SelectedToggleItems().firstOrDefault();
                var selectedGender = (selectedGenderItem == null) ? 0 : selectedGenderItem.data("gender");
                if (selectedGender == 0) {
                    var gendersText = MirDialog.GetItems(".mir-toggle-selection-container div").map(function() {
                        return $.trim($(this).text());
                    }).get().join(" או ");
                    dialogError.text("יש לבחור " + gendersText).show();
                    return;
                }
                var selectedGrade = MirDialog.GetItems(".grades-list").val();
                var selectedAmount = MirDialog.GetItems(".teams-amount-list").val();
                var selectedCategoryName = selectedGrade + ' ' + ((selectedGender == 1) ? 'תלמידים' : 'תלמידות');
                var matchingCategory = allCategories.findItem(function(x) {
                    return x.SPORT_ID == selectedSportFieldSeq && x.CATEGORY_NAME == selectedCategoryName;
                });
                if (matchingCategory == null) {
                    dialogError.text("לא נמצאה קטגוריית אליפות מתאימה, נא לבדוק נתונים").show();;
                    return;
                }
                var selectedCategorySeq = matchingCategory.CHAMPIONSHIP_CATEGORY_ID;
                console.log('Category: ' + selectedCategorySeq + ', amount: ' + selectedAmount);
            });
            if (sportFields.length > 0) {
                MirDialog.TriggerEvent('.sport-fields-list', 'change');
            }
        }, function(err) {
            alert('שגיאה בעת קריאת נתונים, נא לנסות שוב מאוחר יותר');
        });
    }

    function ManageMainCtrl($scope, $http, $q, $timeout, $interval, $state, $rootScope, $filter) {
        $rootScope.login = {
            username: "",
            password: "",
            loading: false,
            error: null
        };
        $rootScope.logout = {
            inProgress: false,
            error: null
        }
        $rootScope.data = {

        };

        angular.element(document).ready(AngularReady);
        angular.element(document).click(AngularClick);

        MirDialog.Init('pnlMain');

        $rootScope.initialLoading = true;
        $http.get('/api/common/logged-user').then(function(resp) {
            $rootScope.initialLoading = false;
            if (resp.data != null) {
                $rootScope.loggedInUser = MirHelpers.ShallowCopy(resp.data);
                if ($rootScope.loggedInUser && $rootScope.loggedInUser.state == 'club-register') {
                    LoadSchoolTeamsTable($timeout, $http, $rootScope, $filter, $rootScope.loggedInUser.schoolSymbol);
                    //console.log($rootScope.loggedInUser);
                }
            }
        }, function(err) {
            $rootScope.initialLoading = false;
            console.log('error loading global data');
        });

        $rootScope.MirTable = MirTable;
        $rootScope.submitLoginForm = function() {
            var userLogin = $.trim($rootScope.login.username || '');
            var userPassword = $rootScope.login.password || '';
            $rootScope.login.error = null;
            if (userLogin.length > 0 && userPassword.length > 0) {
                $rootScope.login.loading = true;
                $http.post("/api/login", {
                    username: userLogin,
                    password: userPassword
                }).then(function (resp) {
                    $rootScope.login.loading = false;
                    $rootScope.loggedInUser = MirHelpers.ShallowCopy(resp.data);
                    /*
                     displayName: "יהב ברוורמן"
                     isClub: false
                     role: 1
                     schoolSymbol: null
                     seq: 90110
                     */
                    /*
                     displayName: "אהל שם רמת גן"
                     isClub: true
                     role: 2
                     schoolSymbol: "540203"
                     seq: 90264
                     */
                }, function (data) {
                    $rootScope.login.loading = false;
                    if (data && data.status == 401) {
                        $rootScope.login.error = 'שם משתמש ו/או סיסמה שגויים';
                    } else {
                        $rootScope.login.error = 'שגיאה בעת התחברות';
                    }
                });
            } else {
                $rootScope.login.error = 'יש להזין שם  וסיסמא';
            }
        };

        $rootScope.schoolClubRegister = function() {
            var clubState = 'club-register';
            var requestParams = {
                State: clubState
            };
            $http.post('/api/common/state', requestParams).then(function () {
                $rootScope.loggedInUser.state = clubState;
                LoadSchoolTeamsTable($timeout, $http, $rootScope, $filter, $rootScope.loggedInUser.schoolSymbol);
            }, function() {
                alert('שגיאה כללית, נא לנסות שוב מאוחר יותר')
            });
        };

        $rootScope.addNewTeam = function($event) {
            $.get("views/AddTeam.html").then(function(resp) {
                var rawHTML = resp + '';
                AddNewTeam(rawHTML, $http, $rootScope.loggedInUser.schoolSymbol);
            });
            $event.stopPropagation();
        };

        $rootScope.backToDashboard = function() {
            var requestParams = {
                State: null
            };
            $http.post('/api/common/state', requestParams).then(function () {
                $rootScope.loggedInUser.state = null;
            }, function() {
                alert('שגיאה כללית, נא לנסות שוב מאוחר יותר')
            });
        };

        $rootScope.logout = function() {
            $rootScope.logout.inProgress = true;
            $rootScope.logout.error = null;
            $http.post('/api/logout').then(function () {
                $rootScope.logout.inProgress = false;
                $rootScope.loggedInUser = null;
            }, function (resp) {
                $rootScope.logout.inProgress = false;
                $rootScope.logout.error = "שגיאה כללית בעת ניתוק משתמש, נא לנסות שוב מאוחר יותר";
            });
        };
    }
})();

function AngularReady() {
    $("#pnlMain").show();
    var firstTextbox = null;
    var minTabIndex = 99999;
    window.setTimeout(function() {
        $("input[type='text']").each(function () {
            var curTabIndex = this.tabIndex;
            if (curTabIndex < minTabIndex) {
                firstTextbox = $(this);
                minTabIndex = curTabIndex;
            }
        });
        if (firstTextbox != null) {
            firstTextbox.focus();
        }
    }, 200);
}

function AngularClick(e) {
    MirDialog.BodyClicked(e);
}

$(document).ready(function() {
    $(document).keypress(function(e) {
        if (e.which == 13) {
            if (e.target != null) {
                var oForm = $(e.target).parents('form').first();
                if (oForm.length == 1) {
                    var defaultButtonId = oForm.data('default-button') || '';
                    if (defaultButtonId.length > 0) {
                        $("#" + defaultButtonId).click();
                        e.preventDefault();
                    }
                }
            }
        }
    });
    MirDialog.DocumentReady();
});