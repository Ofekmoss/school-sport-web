(function() {
    'use strict';

    angular
        .module('sport.club-register')
        .controller('ClubRegisterController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', '$uibModal', 'messageBox', ClubRegisterController])
        .controller('ClubRegisterWelcomeDialogCtrl', ['$scope', '$uibModalInstance', '$sce', 'school', ClubRegisterWelcomeDialogCtrl]);

    function ClubRegisterController($scope, $state, $http, $filter, $timeout, $interval, $uibModal, messageBox) {
        var allClubData = null;
        var hebrewFemaleCounting = ['ראשונה', 'שנייה', 'שלישית', 'רביעית', 'חמישית', 'שישית', 'שביעית', 'שמינית', 'תשיעית', 'עשירית'];
        var tabBaseStyles = {
            '1': 'padding: 5px 5px 5px 5px;',
            '2': ''
        };
        var tabActiveStyles = {
            '1': 'background-color: #00ADEE;',
            '2': 'color: white;'
        };
        var tabRequiredFields = {
            '1': [
                {
                    Property: 'HasConfirmedClubTerms',
                    Type: 'boolean',
                    Message: 'אישור קריאת התחייבות'
                }
            ],
            '4': [
                {
                    Property: 'HasConfirmedFacilityTerms',
                    Type: 'boolean',
                    Message: 'אישור קריאת התחייבות'
                }
            ]
        };
        $scope.loggedUser = null;
        $scope.hasConfirmedFinalSubmission = false;
        $scope.data = {
            selectedTab: null,
            authorizationLevels: registerUtils.sharedClubData.authorizationLevels,
            yesNoOptions: registerUtils.sharedClubData.yesNoOptions,
            clubFormTabs: [
                { Index: 1, Caption: 'פרטי ביה"ס' },
                { Index: 2, Caption: 'רישום קבוצות' , NoData: true },
                { Index: 3, Caption: 'דמי רישום' },
                { Index: 4, Caption: 'מתקני פעילות' },
                { Index: 5, Caption: 'חברי הנהלת מועדון' },
                { Index: 6, Caption: 'נתוני מאמנים' }
                //{ Index: 6, Caption: 'ימי אירוח' },
            ],
            facilitySportFields: [
            ],
            hebrewWeekDays: [
                { Index: 1, Name: "א'" },
                { Index: 2, Name: "ב'" },
                { Index: 3, Name: "ג'" },
                { Index: 4, Name: "ד'" },
                { Index: 5, Name: "ה'" }
            ],
            managementBoardMembers: [
                { Id: 1, Caption: 'יו"ר'},
                { Id: 2, Caption: 'סגן יו"ר'},
                { Id: 3, Caption: 'רכז מועדון'},
                { Id: 4, Caption: 'חבר'},
                { Id: 5, Caption: 'חבר'},
                { Id: 6, Caption: 'חבר'},
            ],
            hostingDays: [
                { Id: 1, SportField: 'כדורעף' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 2, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 3, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 4, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 5, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 6, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 2, SportField: 'כדוריד' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 2, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 3, SportField:  'כדורגל', Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 4, SportField: 'כדורסל' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 5, SportField: 'טניס שולחן' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 6, SportField: 'בדמינטון' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]}
            ],
            coachesData: []
        };
        $scope.school = {
            OrdersBasket: [],
            Cheque: {}
        };

        function ReloadOrdersBasket() {
            $http.get('/api/school-club/team-orders').then(function(resp) {
                $scope.school.OrdersBasket = resp.data;
                $scope.school.OrdersBasket.forEach(function(order, index) {
                    order.Index = index + 1;
                });
            }, function(err) {
                console.log('error getting orders basket');
            });
        }

        ReloadOrdersBasket();

        function ApplyUserData() {
            var schoolSymbol = $scope.loggedUser.SchoolSymbol;
            $http.get('/api/sportsman/school-data?symbol=' + schoolSymbol).then(function(resp) {
                $scope.isClubSchool = resp.data.CLUB_STATUS == 1;
            });
            if (schoolSymbol) {
                registerUtils.buildSchoolName($http, schoolSymbol).then(function (schoolName) {
                    $scope.loggedUser.SchoolName = schoolName;
                }, function (err) {
                    console.log('error reading school name');
                    console.log(err);
                });
            }
        }

        function ApplyActiveTab(tab) {
            $scope.data.clubFormTabs.forEach(function(curTab) {
                if (curTab.Index != tab.Index) {
                    curTab.Active = false;
                }
            });
            tab.Active = true;
            $scope.data.selectedTab = tab;
        }

        function GetActiveTab() {
            return $scope.data.clubFormTabs.findItem(function(x) {
                return x.Active == true;
            });
        }

        function ApplyTabIndices(array, initialTabIndex, indexProperties, omittedProperties) {
            if (typeof omittedProperties == 'undefined')
                omittedProperties = [];
            if (array.length > 0) {
                if (indexProperties.length == 0) {
                    var omitMapping = {};
                    omittedProperties.forEach(function(propertyName) {
                        omitMapping[propertyName] = true;
                    });
                    for (var propertyName in array[0]) {
                        if (!omitMapping[propertyName]) {
                            indexProperties.push(propertyName);
                        }
                    }
                }
                var tabIndex = initialTabIndex;
                array.forEach(function(item) {
                    indexProperties.forEach(function(propertyName) {
                        item[propertyName + 'TabIndex'] = tabIndex;
                        tabIndex++;
                    });
                });
            }
        }

        function VerifyFields(tab) {
            function VerifySingleField(field) {
                var value = $scope.school[field.Property];
                var valid = false;
                switch (field.Type) {
                    case 'boolean':
                        valid = (value == true);
                        break;
                    case 'not-empty':
                        valid = value && value.toString().length > 0;
                        break;
                }
                return valid;
            }

            var requiredFields = tabRequiredFields[tab.Index.toString()] || [];
            if (requiredFields.length > 0) {
                var missingFields = requiredFields.filter(function(field) {
                    return VerifySingleField(field) == false;
                }).map(function(field) {
                    return field.Message;
                });
                if (missingFields.length > 0) {
                    var title = 'שדות דרושים חסרים';
                    var message = 'יש למלא את השדות הבאים: ' + '<br />' + missingFields.join('<br />');
                    messageBox.warn(message, {title: title, htmlContents: true});
                    return false;
                }
            }
            return true;
        }

        function ReadServerData(callback) {
            function GetMatchingRows(allRows, dataCaption) {
                if (dataCaption.length > 0 && !dataCaption.endsWith('_'))
                    dataCaption += '_';
                return allRows.filter(function(row) {
                    return row.PropertyName.startsWith(dataCaption);
                });
            }

            function ApplyDataObject(dataObject, allRows, dataCaption, specialPropertiesMapping, addNonExistentProperties) {
                function ExtractPropertyValue(propertyName, rawValue) {
                    var specialPropertyData = specialPropertiesMapping[propertyName];
                    if (specialPropertyData && rawValue != null) {
                        if (specialPropertyData.IsBoolean) {
                            return (rawValue == '1') ? true : false;
                        } else if (specialPropertyData.IsArray) {
                            return rawValue.split(',');
                        } else {
                            var matchingItem = specialPropertyData.Items.findItem(function (item) {
                                return item[specialPropertyData.KeyProperty] == rawValue;
                            });
                            if (matchingItem != null)
                                return matchingItem;
                        }
                    }
                    return rawValue;
                }

                if (typeof specialPropertiesMapping == 'undefined' || specialPropertiesMapping == null)
                    specialPropertiesMapping = {};

                if (addNonExistentProperties == 'undefined')
                    addNonExistentProperties = false;

                var dataRows = GetMatchingRows(allRows, dataCaption);
                if (dataRows.length == 0)
                    return;

                dataRows.forEach(function(dataRow) {
                    var parts = dataRow.PropertyName.split('_');
                    var propertyName = parts.lastItem();
                    var actualObject = null;
                    if (parts.length == 3) {
                        var innerObjectName = parts[1];
                        if (dataObject.hasOwnProperty(innerObjectName))
                            actualObject = dataObject[innerObjectName];
                    };
                    if (parts.length > 3)
                        propertyName = parts.skip(2).join('_');
                    if (actualObject == null)
                        actualObject = dataObject;
                    if (propertyName && (actualObject.hasOwnProperty(propertyName) || addNonExistentProperties)) {
                        var propertyValue = dataRow.PropertyValue;
                        actualObject[propertyName] = ExtractPropertyValue(propertyName, propertyValue);
                    }
                });
            }

            function ApplyArrayData(array, allRows, dataCaption, specialPropertiesMapping, addNonExistentProperties) {
                if (typeof specialPropertiesMapping == 'undefined')
                    specialPropertiesMapping = {};
                if (addNonExistentProperties == 'undefined')
                    addNonExistentProperties = false;
                var matchingRows = GetMatchingRows(allRows, dataCaption);
                array.forEach(function(item, index) {
                    var rowIndex = item.Id || item.Index;
                    if (!rowIndex)
                        rowIndex = index + 1;
                    var curItemCaption = dataCaption + '_' + rowIndex;
                    ApplyDataObject(item, matchingRows, curItemCaption, specialPropertiesMapping, addNonExistentProperties);
                });
            }

            function SetIfNotBlank(sourceObject, targetObject, sourcePropertyName, targetPropertyName) {
                var value = sourceObject[sourcePropertyName];
                if (value)
                    targetObject[targetPropertyName] = value;
            }

            if (typeof callback == 'undefined')
                callback = null;

            $http.get('/api/school-club/data').then(function(resp) {
                var allRows = resp.data;
                allClubData = allRows.slice(0);
                ApplyArrayData($scope.data.coachesData, allRows, 'Coach', {
                    'AuthorizationLevel': { Items: $scope.data.authorizationLevels, KeyProperty: 'Id' },
                    'PassedCoachTraining': { Items: $scope.data.yesNoOptions, KeyProperty: 'Id' }
                });
                ApplyDataObject($scope.school, allRows, 'School', {
                    'IsAssociation': { IsBoolean: true },
                    'IsAssociationConfirmed': { IsBoolean: true },
                    'HasConfirmedClubTerms': { IsBoolean: true },
                    'HasConfirmedFacilityTerms': { IsBoolean: true }
                }, true);
                ApplyArrayData($scope.data.managementBoardMembers, allRows, 'ManagementBoardMember', {}, true);
                ApplyArrayData($scope.data.hostingDays, allRows, 'HostingDay', {}, true);
                $scope.data.hostingDays.forEach(function(hostingDay) {
                    hostingDay.Categories.forEach(function(category) {
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_Name', 'Name');
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_Weekday', 'Weekday');
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_HostingHour', 'HostingHour');
                    });
                });
                $http.get('/api/common/school-user-data').then(function(resp) {
                    var schoolUserData = sportUtils.shallowCopy(resp.data);
                    $http.get('/api/common/club-facility-data').then(function(resp) {
                        var regionalFacilityDataItems = resp.data.filter(function(x) {
                            return x.REGION_ID == schoolUserData.REGION_ID;
                        });
                        $scope.data.facilitySportFields = sportUtils.DistinctArray(regionalFacilityDataItems, 'SportFieldSeq').map(function(facilityData) {
                            return {
                                Id: facilityData.SportFieldSeq,
                                Name: facilityData.SportFieldName
                            };
                        });
                        ApplyArrayData($scope.data.facilitySportFields, allClubData, 'FacilitySportField', {}, true); //'Days': { IsArray: true }
                        ApplyTabIndices($scope.data.facilitySportFields, 3, ['Address', 'Contact', 'HostingHours']);
                        /*
                         { Id: 1, Name: 'כדורעף' },
                         { Id: 2, Name: 'כדוריד' },
                         { Id: 3, Name: 'כדורגל 5X5'} //,
                         //{ Id: 4, Name: 'כדורסל' },
                         //{ Id: 5, Name: 'טניס שולחן' },
                         //{ Id: 6, Name: 'כדורעף חופים' },
                         //{ Id: 7, Name: 'בדמינטון' },
                         //{ Id: 8, Name: 'ג\'ודו' }
                         */
                        if (callback != null)
                            callback('SUCCESS');
                    }, function(err) {
                        console.log('error reading facility data');
                        if (callback != null)
                            callback('ERROR');
                    });
                }, function(err) {
                    console.log('error reading school data');
                    if (callback != null)
                        callback('ERROR');
                });
            }, function(err) {
                console.log('error reading school club data');
                if (callback != null)
                    callback('ERROR');
            });
        }

        function ApplyPersonnelData() {
            var url = '/api/sportsman/school/' + $scope.loggedUser.SchoolSymbol + '/personnel';
            $http.get(url).then(function(resp) {
                var schoolPersonnel = resp.data;
                var propertiesMapping = {
                    ManagerEmail: 'SCHOOL_EMAIL',
                    ManagerName: 'SCHOOL_MANAGER_NAME',
                    FaxNumber: 'SCHOOL_FAX',
                    PhoneNumber: 'SCHOOL_PHONE',
                    ChairmanAddress: 'CHAIRMAN_ADDRESS',
                    ChairmanName: 'CHAIRMAN_NAME',
                    ChairmanZipCode: 'CHAIRMAN_ZIP_CODE',
                    ChairmanCity: 'CHAIRMAN_CITY_NAME',
                    ChairmanFax: 'CHAIRMAN_FAX',
                    ChairmanPhoneNumber: 'CHAIRMAN_PHONE',
                    CoordinatorAddress: 'COORDINATOR_ADDRESS',
                    CoordinatorName: 'COORDINATOR_NAME',
                    CoordinatorZipCode: 'COORDINATOR_ZIP_CODE',
                    CoordinatorCity: 'COORDINATOR_CITY_NAME',
                    CoordinatorCellPhone: 'COORDINATOR_CELL_PHONE',
                    CoordinatorPhoneNumber: 'COORDINATOR_PHONE',
                    CoordinatorFax: 'COORDINATOR_FAX',
                    CoordinatorEmailAddress: 'COORDINATOR_EMAIL'
                };
                for (var propertyName in propertiesMapping) {
                    var existingValue = $scope.school[propertyName];
                    if (typeof existingValue == 'undefined' || existingValue == null || existingValue.toString().length == 0)
                        $scope.school[propertyName] = schoolPersonnel[propertiesMapping[propertyName]];
                }
            }, function(err) {
                console.log('error reading school personnel');
            });
        }

        function SaveDataObject(dataObject, prefix, excludedProperties, successCallback, errorCallback) {
            if (typeof excludedProperties == 'undefined')
                excludedProperties = [];
            if (typeof successCallback == 'undefined')
                successCallback = null;
            if (typeof errorCallback == 'undefined')
                errorCallback = null;
            if (excludedProperties.findIndex(function(x) { return x == 'Id'; }) < 0)
                excludedProperties.push('Id');
            if (excludedProperties.findIndex(function(x) { return x == 'Index'; }) < 0)
                excludedProperties.push('Index');
            if (prefix.length > 0 && !prefix.endsWith('_'))
                prefix += '_';
            var requestParams = {
                Data: dataObject,
                Prefix: prefix,
                Excluded: excludedProperties
            };
            $http.post('/api/school-club/data', requestParams).then(function(resp) {
                if (successCallback != null) {
                    successCallback(resp);
                }

            }, function(err) {
                if (errorCallback != null) {
                    errorCallback(err);
                }
            });
        }

        function SaveArrayOfData(array, dataCaption, excludedProperties, currentIndex, successCallback, errorCallback) {
            if (currentIndex >= array.length) {
                successCallback();
                return;
            }

            var currentItem = array[currentIndex];
            var id = currentItem.Id || currentItem.Index;
            if (id) {
                var prefix = dataCaption + '_' + id + '_';
                SaveDataObject(currentItem, prefix, excludedProperties, function () {
                    SaveArrayOfData(array, dataCaption, excludedProperties, currentIndex + 1, successCallback, errorCallback);
                }, function (err) {
                    if (errorCallback != null) {
                        errorCallback(err);
                    }
                });
            } else {
                errorCallback('no id found for item in index ' + currentIndex);
            }
        }

        if ($scope.data.clubFormTabs.length > 0) {
            ApplyActiveTab($scope.data.clubFormTabs[0]);
        }

        for (var i = 0; i <= 6; i++) {
            $scope.data.coachesData.push({
                Id: i + 1,
                SportField: '',
                Name: '',
                IdNumber: '',
                AgeRange: '',
                Gender: '',
                AuthorizationLevel: null,
                PassedCoachTraining: null,
                Cellular: '',
                Address: '',
                Email: ''
            });
        }

        ApplyTabIndices($scope.data.managementBoardMembers, 1, ['Name', 'Role']);
        ApplyTabIndices($scope.data.coachesData, 1, [], ['Id']);
        if ($scope.data.hostingDays.length > 0) {
            var tabIndex = 1;
            $scope.data.hostingDays.forEach(function(hostingDay) {
                ApplyTabIndices(hostingDay.Categories, tabIndex, ['Name', 'Weekday', 'HostingHour'])
                tabIndex += (hostingDay.Categories.length * 3);
                hostingDay.Categories.forEach(function(category) {
                    category.NamePlaceholder = 'קטגוריית ' + hostingDay.SportField;
                    if (hostingDay.Categories.length > 1)
                        category.NamePlaceholder += ' ' + hebrewFemaleCounting[category.Index - 1];
                    category.WeekdayPlaceholder = 'יום פעילות עבור ' ;
                    category.HostingHoursPlaceholder = 'שעות אירוח עבור ';
                    if (hostingDay.Categories.length > 1) {
                        category.WeekdayPlaceholder += category.NamePlaceholder;
                        category.HostingHoursPlaceholder += category.NamePlaceholder;
                    } else {
                        category.WeekdayPlaceholder += hostingDay.SportField;
                        category.HostingHoursPlaceholder += hostingDay.SportField;
                    }
                });
            });
        }

        $interval(function() {
            if (window["reload_orders_basket"] == "1") {
                console.log('reloading orders basket due to trigger...')
                window["reload_orders_basket"] = null;
                ReloadOrdersBasket();
            }
        }, 1000);

        $http.get('/api/login').then(function(resp) {
            if (resp && resp.data && resp.data != null) {
                $scope.loggedUser = {
                    'Seq': resp.data.seq,
                    'Login': resp.data.name,
                    'DisplayName': resp.data.displayName,
                    'Role': resp.data.role,
                    'SchoolSymbol': resp.data.schoolSymbol
                };
                if (resp.data.isClubUser) {
                    /*
                    $uibModal.open({
                        templateUrl: 'views/club-register-welcome-dialog.html',
                        controller: 'ClubRegisterWelcomeDialogCtrl',
                        resolve: {
                            school: function () {
                                return {};
                            }
                        }
                    });
                    */
                    ApplyUserData();
                    ReadServerData(function() {
                        ApplyPersonnelData();
                    });
                } else {
                    $state.go('register');
                }
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
        });

        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        $interval(function() {
            $("form").each(function() {
                var oForm = $(this);
                if (oForm.data("is-dirty") == "1") {
                    var tabIndex = parseInt(oForm.data("tab-index"));
                    if (!isNaN(tabIndex) && tabIndex > 0) {
                        var matchingTab = $scope.data.clubFormTabs.findItem(function(x) {
                            return x.Index == tabIndex;
                        });
                        if (matchingTab != null) {
                            matchingTab.IsDirty = true;
                        }
                    }
                }
            });
        }, 500);

        $scope.getFormTabStyle = function(tab, type) {
            var style = tabBaseStyles[type.toString()];
            if (tab.Active) {
                style += ' ' + tabActiveStyles[type.toString()];
            }
            return style;
        };

        $scope.tabClicked = function(tab) {
            var curActiveTab = GetActiveTab();
            if (curActiveTab == null) {
                ApplyActiveTab(tab);
                return;
            }
            if (curActiveTab.Index == tab.Index)
                return;
            if (VerifyFields(curActiveTab)) {
                /*
                if (curActiveTab.IsDirty) {
                    var msg = 'נתונים לא נשמרו, האם ברצונך לשמור?';
                    var options = {
                        confirmCaption: 'שמור',
                        cancelCaption: 'אל תשמור'
                    };
                    messageBox.ask(msg, options).then(function () {

                    });
                } else {
                    ApplyActiveTab(tab);
                }
                */
                $scope.saveTab(curActiveTab, function() {
                    ApplyActiveTab(tab);
                });
            }
        };

        $scope.getAuthorizationLevelClass = function(coach, authorizationLevel) {
            return coach.AuthorizationLevel && coach.AuthorizationLevel.Id == authorizationLevel.Id ? 'fa fa-check' : 'fa fa-circle-o';
        };

        $scope.getPassedCoachTrainingClass = function(coach, yesNoOption) {
            return coach.PassedCoachTraining && coach.PassedCoachTraining.Id == yesNoOption.Id ? 'fa fa-check' : 'fa fa-circle-o';
        };

        $scope.getAssociationClass = function() {
            return $scope.school.IsAssociation ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.authorizationLevelClicked = function(authorizationLevel, coach) {
            coach.AuthorizationLevel = authorizationLevel;
        };

        $scope.passedCoachTrainingClicked = function(yesNoOption, coach) {
            coach.PassedCoachTraining = yesNoOption;
        };

        $scope.associationClicked = function() {
            $scope.school.IsAssociation = !$scope.school.IsAssociation;
        };

        $scope.getAssociationConfirmedClass = function() {
            return $scope.school.IsAssociationConfirmed ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.associationConfirmedClicked = function() {
            $scope.school.IsAssociationConfirmed = !$scope.school.IsAssociationConfirmed;
        };

        $scope.getHasConfirmedClubTermsClass = function() {
            return $scope.school.HasConfirmedClubTerms ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getHasConfirmedFacilityTermsClass = function() {
            return $scope.school.HasConfirmedFacilityTerms ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getFacilitySportWeekdayClass = function(sportField, weekDay) {
            var checked = sportField.Days && sportField.Days.indexOf(weekDay.Index) >= 0;
            return checked ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getHasConfirmedFinalSubmissionClass = function() {
            var checked = $scope.hasConfirmedFinalSubmission;
            return checked ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.hasConfirmedClubTermsClicked = function() {
            $scope.school.HasConfirmedClubTerms = !$scope.school.HasConfirmedClubTerms;
        };

        $scope.hasConfirmedFacilityTermsClicked = function() {
            $scope.school.HasConfirmedFacilityTerms = !$scope.school.HasConfirmedFacilityTerms;
        };

        $scope.hasConfirmedFinalSubmissionClicked = function() {
            $scope.hasConfirmedFinalSubmission = !$scope.hasConfirmedFinalSubmission;
        };

        $scope.facilitySportWeekdayClicked = function(sportField, weekDay) {
            if (!sportField.Days)
                sportField.Days = [];
            var existingIndex = sportField.Days.indexOf(weekDay.Index);
            if (existingIndex >= 0) {
                sportField.Days.removeItem(weekDay.Index, existingIndex);
            } else {
                sportField.Days.push(weekDay.Index);
            }
        };

        $scope.ParseChequeSum = function() {
            var rawSum = $scope.school.Cheque.Sum;
            if (rawSum && rawSum.length > 0) {
                return sportUtils.ParseHebrewCurrency(rawSum);
            }
            return '';
        };

        $scope.focusFacilityField = function(sportField, classType) {
            $('.facility-' + classType + '[data-sportfield-id="' + sportField.Id + '"]').find('input').focus();
        };

        $scope.addTeam = function() {
            var existingCategories = $scope.school.OrdersBasket.map(function(x) {
                return x.CHAMPIONSHIP_CATEGORY_ID;
            });
            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function () {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            ClubsOnly: true,
                            NoConfirmation: true,
                            ExcludedCategories: existingCategories
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {
                            show_championship_remarks: true
                        };
                    }
                }
            }).result.then(function (data) {
                    var requestParams = {
                        Category: data.Category.CategoryId,
                        Amount: data.Amount
                    };
                    $http.put('/api/school-club/team-order', requestParams).then(function(resp) {
                        ReloadOrdersBasket();
                    }, function(err) {
                        console.log('error posting new order');
                    });
                });
        };

        $scope.coachIdNumberChanged = function(coach) {
            var idNumber = coach.IdNumber ? parseInt(coach.IdNumber) : 0;
            if (!isNaN(idNumber) && idNumber > 0) {
                var matchingCoach = $scope.data.coachesData.findItem(function (x) {
                    return x.Id != coach.Id && x.IdNumber && parseInt(x.IdNumber) == idNumber;
                });
                if (matchingCoach != null) {
                    for (var propertyName in matchingCoach) {
                        if (propertyName != 'Id' && propertyName != 'IdNumber') {
                            var curValue = matchingCoach[propertyName];
                            if (curValue != null && curValue != '')
                                coach[propertyName] = curValue;
                        }
                    }
                }
            }
        };

        $scope.deleteTeamOrder = function(order) {
            var msg = 'האם למחוק הזמנה זו?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/school-club/team-order?category=' + order.CHAMPIONSHIP_CATEGORY_ID).then(function() {
                    ReloadOrdersBasket();
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.editTeamOrder = function(order) {
            var existingCategories = $scope.school.OrdersBasket.map(function(x) {
                return x.CHAMPIONSHIP_CATEGORY_ID;
            });
            var excludedCategories = existingCategories.filter(function(x) {
                return x != order.CHAMPIONSHIP_CATEGORY_ID;
            });
            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function () {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            ClubsOnly: true,
                            NoConfirmation: true,
                            ExcludedCategories: excludedCategories
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {
                            category: order.CHAMPIONSHIP_CATEGORY_ID,
                            amount: order.Amount,
                            show_championship_remarks: true
                        };
                    }
                }
            }).result.then(function (data) {
                    var requestParams = {
                        OldCategory: order.CHAMPIONSHIP_CATEGORY_ID,
                        NewCategory: data.Category.CategoryId,
                        Amount: data.Amount
                    };
                    $http.post('/api/school-club/team-order', requestParams).then(function(resp) {
                        ReloadOrdersBasket();
                    }, function(err) {
                        console.log('error updating order');
                        alert('שגיאה בעת עדכון נתוני קבוצה, נא לנסות שוב מאוחר יותר');
                    });
                });
        };

        $scope.saveTab = function(tab, callback) {
            if (typeof tab == 'undefined' || tab == null)
                tab = GetActiveTab();
            if (typeof callback == 'undefined')
                callback = null;
            if (tab == null) {
                console.log('no active tab');
                if (callback != null) {
                    callback();
                }
                return;
            }
            console.log('saving tab ' + tab.Index + '...');
            var arrayOfData = null;
            var dataObject = null;
            var dataCaption = '';
            var excludedProperties = [];
            switch (tab.Index) {
                case 1:
                    dataObject = $scope.school;
                    dataCaption = 'School_Data';
                    excludedProperties.push('OrdersBasket');
                    excludedProperties.push('Cheque');
                    excludedProperties.push('HasConfirmedFacilityTerms');
                    break;
                case 3:
                    dataObject = $scope.school.Cheque;
                    dataCaption = 'School_Cheque';
                    break;
                case 4:
                    arrayOfData = $scope.data.facilitySportFields;
                    dataCaption = 'FacilitySportField';
                    excludedProperties.push('Name');
                    break;
                case 5:
                    arrayOfData = $scope.data.managementBoardMembers;
                    dataCaption = 'ManagementBoardMember';
                    excludedProperties.push('Caption');
                    break;
                case 6:
                    arrayOfData = $scope.data.coachesData;
                    dataCaption = 'Coach';
                    /*
                    arrayOfData = $scope.data.hostingDays;
                    dataCaption = 'HostingDay';
                    excludedProperties.push('SportField');
                    excludedProperties.push('Categories');
                    arrayOfData.forEach(function(hostingDay) {
                        hostingDay.Categories.forEach(function(category) {
                            var prefix = 'Category_' + category.Index;
                            if (category.Name)
                                hostingDay[prefix + '_Name'] = category.Name;
                            if (category.Weekday)
                                hostingDay[prefix + '_Weekday'] = category.Weekday;
                            if (category.HostingHour)
                                hostingDay[prefix + '_HostingHour'] = category.HostingHour;
                        });
                    });
                    */
                    break;
                case 7:

                    break;
            }

            var successCallback = function() {
                if (tab.Index == 4) {
                    SaveDataObject({
                        HasConfirmedFacilityTerms: $scope.school.HasConfirmedFacilityTerms
                    }, 'School_Facility', [], null, null);
                }
                tab.SaveInProgress = false;
                tab.SavedSuccessfully = true;
                tab.IsDirty = false;
                if (callback != null) {
                    callback('success');
                }
                $timeout(function () {
                    tab.SavedSuccessfully = false;
                }, 5000);
            };

            var errorCallback = function() {
                tab.SaveInProgress = false;
                tab.SaveFailed = true;
                if (callback != null) {
                    callback('error');
                }
                $timeout(function () {
                    tab.SaveFailed = false;
                }, 5000);
            };

            if (arrayOfData != null) {
                tab.SaveInProgress = true;
                SaveArrayOfData(arrayOfData, dataCaption, excludedProperties, 0, successCallback, errorCallback);
            } else if (dataObject != null) {
                tab.SaveInProgress = true;
                SaveDataObject(dataObject, dataCaption, excludedProperties, successCallback, errorCallback);
            } else {
                if (callback != null) {
                    callback();
                }
            }
        };

        $scope.saveAndMove = function() {
            var curActiveTab = GetActiveTab();
            if (curActiveTab != null) {
                if (curActiveTab.Index == 6) {
                    if (!$scope.hasConfirmedFinalSubmission) {
                        messageBox.warn('נא לאשר שליחת נתונים ורישום קבוצות', {title: 'הדפסת טופס רישום'});
                    }
                } else {
                    $scope.saveTab(curActiveTab, function () {
                        var nextIndex = curActiveTab.Index + 1;
                        var nextTab = $scope.data.clubFormTabs.findItem(function (x) {
                            return x.Index == nextIndex;
                        });
                        if (nextTab != null) {
                            $scope.tabClicked(nextTab);
                        }
                    });
                }
            }
        };
    }

    function ClubRegisterWelcomeDialogCtrl($scope, $uibModalInstance, $sce, school) {
        $scope.confirm = function () {
            $uibModalInstance.close("OK");
        };
    }
})();

function CheckFinalSubmission() {
    return $("#lblConfirmFinalSubmission").hasClass("fa-check-square-o");
}