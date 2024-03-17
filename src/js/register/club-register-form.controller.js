(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('ClubRegisterFormController',
            ['$scope', '$http', '$q', '$sce', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', ClubRegisterFormController]);


    function ClubRegisterFormController($scope, $http, $q, $sce, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var qs = sportUtils.ParseQueryString();
        var schoolSymbol = parseInt(qs['s']);
        var unAuthorizedMessage = 'אינך מורשה לראות עמוד זה, נא להתחבר למערכת';

        $scope.now = new Date();
        $scope.schoolOrdersBasket = [];
        $scope.loggedUser = null;

        $http.get('/api/login').then(function(resp) {
            $scope.loggedUser = resp.data;
            if ($scope.loggedUser == null || !$scope.loggedUser.schoolSymbol) {
                $scope.error = unAuthorizedMessage;
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
            $scope.error = unAuthorizedMessage;
        });

        function ApplyServerData() {
            function ApplyTextboxValue(selector, propertyMapping, propertyName, calculator) {
                var value = propertyMapping[propertyName] || "";
                if (typeof calculator == 'function') {
                    value = calculator(value);
                }
                $(selector).val(value);
            }

            function ApplyCheckboxValue(checkboxName, propertyMapping, propertyName) {
                var value = propertyMapping[propertyName] == '1' ? '1' : '0';
                $("input[name='" + checkboxName + "'][value='" + value + "']").prop("checked", true);
            }

            function ApplyPhoneNumberWithPrefix(prefixSelector, actualSelector, propertyMapping, propertyName) {
                var rawValue = (propertyMapping[propertyName] || '');
                var phonePrefix = '';
                var phoneNumber = '';
                if (rawValue.indexOf("-") > 0) {
                    var parts = rawValue.split('-').filter(function(x) { return x.length > 0; });
                    if (parts.length > 2) {
                        phonePrefix = parts[0];
                        phoneNumber = parts.skip(1).join('');
                    }
                }
                if (phoneNumber.length == 0)
                    phoneNumber = rawValue;
                $(prefixSelector).val(phonePrefix);
                $(actualSelector).val(phoneNumber);
            }

            function ApplyFacilityDaysAndDetails(propertyMapping, propertyName) {
                function ApplySportFieldDaysCells(clonedRow, sportFieldData) {
                    var allCells = clonedRow.find('td');
                    allCells.first().text(sportFieldData.Name);
                    var daysInUse = [];
                    sportFieldData.WeekdaysData.forEach(function (weekdayData) {
                        var day = weekdayData.WeekDay;
                        if (day > 0) {
                            var rawData = sportUtils.EncodeHTML(weekdayData.RawData);
                            allCells.eq(day).html(rawData);
                            daysInUse.push(day);
                        }
                    });
                    if (daysInUse.length > 0) {
                        var dayMapping = daysInUse.toAssociativeArray();
                        for (var cellIndex = 1; cellIndex < allCells.length; cellIndex++) {
                            if (!dayMapping[cellIndex.toString()]) {
                                allCells.eq(cellIndex).text("");
                            }
                        }
                    }
                }

                function ApplySportFieldFacilitiesCells(clonedRow, sportFieldData, rowIndex) {
                    function ApplySingleCell(cellClass, propertySuffix) {
                        var oInput = clonedRow.find('.facility-' + cellClass).find('input');
                        if (oInput.length == 1) {
                            var propertyName = 'FacilitySportField_' + sportFieldData.Seq + '_' + propertySuffix;
                            var storedValue = propertyMapping[propertyName] || '';
                            oInput.val(storedValue);
                        }
                    }

                    var allCells = clonedRow.find('td');
                    allCells.eq(0).text((rowIndex + 1) + ".");
                    allCells.eq(1).text(sportFieldData.Name);
                    ApplySingleCell('address', 'Address');
                    ApplySingleCell('hours', 'HostingHours');
                    ApplySingleCell('contact', 'Contact');
                }

                //ApplyFacilityDetails("#", propertyMapping, ["FacilitySportField_$sport_Address", "FacilitySportField_$sport_Contact",
                //["FacilitySportField_$sport_Phone", "FacilitySportField_$sport_Fax"]]);
                var oSportFieldDaysTable = $(".SportFieldDays");
                var oFacilityDetailsTable = $("#tblFacilities");
                var daysTemplateRow = $("#sportFieldDaysRowTemplate");
                var facilitiesTemplateRow = $("#sportFieldFacilitiesRowTemplate");
                if (oSportFieldDaysTable.length > 0 && oFacilityDetailsTable.length > 0 && daysTemplateRow.length == 1 && facilitiesTemplateRow.length == 1) {
                    $http.get('/api/common/school-user-data').then(function(resp) {
                        var schoolUserData = sportUtils.shallowCopy(resp.data);
                        $http.get('/api/common/club-facility-data').then(function (resp) {
                            var regionalFacilityDataItems = resp.data.filter(function (x) {
                                return x.REGION_ID == schoolUserData.REGION_ID;
                            });
                            var sportFieldMapping = {};
                            regionalFacilityDataItems.forEach(function(facilityData) {
                                var key = facilityData.SportFieldSeq.toString();
                                if (!sportFieldMapping[key]) {
                                    sportFieldMapping[key] = {
                                        Name: facilityData.SportFieldName,
                                        Seq: facilityData.SportFieldSeq,
                                        WeekdaysData: []
                                    }
                                }
                                sportFieldMapping[key].WeekdaysData.push(facilityData);
                            });
                            var rowIndex = 0;
                            for (var sportFieldSeq in sportFieldMapping) {
                                var clonedDaysRow = daysTemplateRow.clone();
                                var clonedFacilitiesRow = facilitiesTemplateRow.clone();
                                ApplySportFieldDaysCells(clonedDaysRow, sportFieldMapping[sportFieldSeq]);
                                ApplySportFieldFacilitiesCells(clonedFacilitiesRow, sportFieldMapping[sportFieldSeq], rowIndex);
                                clonedDaysRow.show();
                                oSportFieldDaysTable.append(clonedDaysRow);
                                clonedFacilitiesRow.show();
                                oFacilityDetailsTable.append(clonedFacilitiesRow);
                                rowIndex++;
                            }
                        });
                    });

                    /*
                     var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var key = propertyName.replace("$sport", sportFieldIndex.toString());
                            var rawDays = propertyMapping[key] || "";
                            if (rawDays.length > 0) {
                                var days = rawDays.split(",").filter(function(x) {
                                    var n = parseInt(x);
                                    return !isNaN(n) && n > 0;
                                });
                                if (days.length > 0) {
                                    days.forEach(function(day) {
                                        //var oCell = currentRow.find("td").eq(day);
                                        //oCell.find("input").val("X");
                                    });
                                }
                            }
                        }
                    }
                    */
                }
            }

            function ApplyFacilityDetails(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, subIndex, propertyName, sportFieldIndex) {
                    var key = propertyName.replace("$sport", sportFieldIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input").eq(subIndex);
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var allCells = currentRow.find("td");
                            ApplySingleCell(allCells, 2, 0, properties[0], sportFieldIndex);
                            ApplySingleCell(allCells, 3, 0, properties[1], sportFieldIndex);
                            ApplySingleCell(allCells, 4, 0, properties[2][0], sportFieldIndex);
                            ApplySingleCell(allCells, 4, 1, properties[2][1], sportFieldIndex);
                        }
                    }
                }
            }

            function ApplyBoardMembers(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, propertyName, rowIndex) {
                    var key = propertyName.replace("$index", rowIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 2; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var allCells = currentRow.find("td");
                        var currentIndex = parseInt(allCells.eq(0).text().replace(".", ""));
                        if (!isNaN(currentIndex) && currentIndex > 0) {
                            ApplySingleCell(allCells, 2, properties[0], currentIndex);
                            ApplySingleCell(allCells, 4, properties[1], currentIndex);
                        }
                    }
                }
            }

            function ApplyCourtHours(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, propertyName, sportFieldIndex, categoryIndex) {
                    var key = propertyName.replace("$sport", sportFieldIndex.toString()).replace("$category", categoryIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        if (categoryIndex > 1)
                            cellIndex--;
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var categoryIndex = parseInt(currentRow.data("category-index"));
                            if (isNaN(categoryIndex) || categoryIndex <= 0)
                                categoryIndex = 1;
                            var allCells = currentRow.find("td");
                            ApplySingleCell(allCells, 1, properties[0], sportFieldIndex, categoryIndex);
                            ApplySingleCell(allCells, 2, properties[1], sportFieldIndex, categoryIndex);
                            ApplySingleCell(allCells, 3, properties[2], sportFieldIndex, categoryIndex);
                        }
                    }
                }
            }

            function ApplyCoaches(tableSelector, propertyMapping, properties, lookupMapping) {
                function ApplySingleCell(allCells, cellIndex, propertyName, rowIndex) {
                    var key = propertyName.replace("$index", rowIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        var lookupTableName = lookupMapping[propertyName] || null;
                        if (lookupTableName != null) {
                            var lookupTable = registerUtils.sharedClubData[lookupTableName];
                            var matchingItem = lookupTable.findItem(function(x) {
                                return x.Id == rawValue;
                            });
                            if (matchingItem != null)
                                rawValue = matchingItem.Caption;
                        }
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var allCells = currentRow.find("td");
                        properties.forEach(function(propertyName, propertyIndex) {
                            ApplySingleCell(allCells, propertyIndex + 1, propertyName, i);
                        });
                    }
                }
            }

            function ApplyMunicipalityChampionships() {
                function CreateMunicipalityChampionshipCell(rawText) {
                    var oCell = $("<td></td>")
                    oCell.text(rawText.toString());
                    return oCell;
                }
                var schoolTeamOrdersTable = $("#tblSchoolTeamOrders");
                var municipalityChampionshipsTable = $("#tblMunicipalityChampionships");
                if (schoolTeamOrdersTable.length > 0 && municipalityChampionshipsTable.length > 0) {
                    municipalityChampionshipsTable.find("tr:gt(0)").remove();
                    var rowIndex = 0;
                    schoolTeamOrdersTable.find("tr:gt(0)").each(function() {
                        var schoolTeamOrdersRow = $(this);
                        var schoolTeamOrderCells = schoolTeamOrdersRow.find("td");
                        var sportFieldName = schoolTeamOrderCells.eq(1).text();
                        var categoryName = schoolTeamOrderCells.eq(3).text();
                        var municipalityChampionshipRow = $("<tr></tr>");
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(rowIndex + 1));
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(sportFieldName));
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(categoryName));
                        municipalityChampionshipsTable.append(municipalityChampionshipRow);
                        rowIndex++;
                    });
                }
            }

            function InjectOrdersTable() {
                var targetContainer = $("#pnlClubsChampionshipsTable");
                if (targetContainer.length == 1) {
                    var sourceTable = $("#tblSchoolTeamOrders");
                    if (sourceTable.length == 1) {
                        targetContainer.html("");
                        var sourceRows = sourceTable.find("tr");
                        if (sourceRows.length < 2) {
                            targetContainer.html("אין קבוצות מוזמנות");
                        } else {
                            targetContainer.append(sourceTable);
                            sourceTable.show();
                            ApplyMunicipalityChampionships();
                        }
                    }
                    return;
                }
                window.setTimeout(InjectOrdersTable, 100);
            }

            function RegisterSingleTeam(index, callback) {
                if ($scope.schoolOrdersBasket == null || index >= $scope.schoolOrdersBasket.length) {
                    console.log('All teams registered');
                    callback();
                    return;
                }

                var curTeam = $scope.schoolOrdersBasket[index];
                var championshipCategory = {
                    ChampionshipId: curTeam.CHAMPIONSHIP_ID,
                    CategoryId: curTeam.CHAMPIONSHIP_CATEGORY_ID
                };
                registerUtils.registerTeams($http, $scope.loggedUser, championshipCategory, curTeam.Amount, function() {
                    RegisterSingleTeam(index + 1, callback);
                }, function(err) {
                    console.log('error registering team for ' + curTeam.CHAMPIONSHIP_CATEGORY_ID);
                });
            }

            $http.get('/api/school-club/data').then(function(resp) {
                var allRows = resp.data;
                var propertyMapping = allRows.toAssociativeArray(null, 'PropertyName', 'PropertyValue');
                ApplyTextboxValue("#school_manager", propertyMapping, "School_Data_ManagerName")
                ApplyTextboxValue("#school_phone", propertyMapping, "School_Data_PhoneNumber");
                ApplyTextboxValue("#school_fax", propertyMapping, "School_Data_FaxNumber");
                ApplyTextboxValue("#school_email", propertyMapping, "School_Data_ManagerEmail");
                ApplyTextboxValue("#ini_chairman_name", propertyMapping, "School_Data_ChairmanName");
                ApplyTextboxValue("#ini_chairman_address", propertyMapping, "School_Data_ChairmanAddress");
                ApplyTextboxValue("#ini_chairman_city", propertyMapping, "School_Data_ChairmanCity");
                ApplyTextboxValue("#ini_chairman_zipcode", propertyMapping, "School_Data_ChairmanZipCode");
                ApplyTextboxValue("#ini_chairman_phone", propertyMapping, "School_Data_ChairmanPhoneNumber");
                ApplyTextboxValue("#ini_chairman_fax", propertyMapping, "School_Data_ChairmanFax");
                ApplyTextboxValue("#coordinator_name", propertyMapping, "School_Data_CoordinatorName");
                ApplyTextboxValue("#coordinator_address", propertyMapping, "School_Data_CoordinatorAddress");
                ApplyTextboxValue("#ini_coordinator_city", propertyMapping, "School_Data_CoordinatorCity");
                ApplyTextboxValue("#coordinator_zipcode", propertyMapping, "School_Data_CoordinatorZipCode");
                ApplyTextboxValue("#coordinator_phone", propertyMapping, "School_Data_CoordinatorPhoneNumber");
                ApplyTextboxValue("#coordinator_cellphone", propertyMapping, "School_Data_CoordinatorCellPhone");
                ApplyTextboxValue("#coordinator_fax", propertyMapping, "School_Data_CoordinatorFax");
                ApplyTextboxValue("#coordinator_email", propertyMapping, "School_Data_CoordinatorEmailAddress");
                ApplyCheckboxValue("ini_is_association", propertyMapping, "School_Data_IsAssociation");
                ApplyTextboxValue("input[name='ini_txtAssociationNumber']", propertyMapping, "School_Data_AssociationNumber");
                ApplyCheckboxValue("ini_got_confirmation", propertyMapping, "School_Data_IsAssociationConfirmed");
                ApplyTextboxValue("#txtRegisterChequeSum", propertyMapping, "School_Cheque_Sum");
                ApplyTextboxValue("#txtRegisterChequeNumber", propertyMapping, "School_Cheque_Number");
                ApplyTextboxValue("#txtRegisterChequeBank", propertyMapping, "School_Cheque_Bank");
                ApplyTextboxValue("#txtRegisterChequeBranch", propertyMapping, "School_Cheque_Branch");
                ApplyTextboxValue("#txtRegisterChequeWords", propertyMapping, "School_Cheque_Sum", function(rawValue) {
                    return (rawValue.length > 0) ? sportUtils.ParseHebrewCurrency(rawValue) : "";
                });
                ApplyTextboxValue("#txtMunicipalityName", propertyMapping, "School_Data_SchoolMunicipalityName");
                ApplyTextboxValue("#txtMunicipalitySymbol", propertyMapping, "School_Data_MunicipalityNumber");
                ApplyFacilityDaysAndDetails(propertyMapping, "FacilitySportField_$sport_Days");
                ApplyTextboxValue("#txtInspectorName", propertyMapping, "School_Data_SupervisorName");
                ApplyTextboxValue("#txtMunicipalityName", propertyMapping, "School_Data_SchoolMunicipalityName");
                ApplyTextboxValue("#txtMunicipalityAddress", propertyMapping, "School_Data_MunicipalityAddress");
                ApplyTextboxValue("#txtMunicipalityCity", propertyMapping, "School_Data_MunicipalityCityName");
                ApplyTextboxValue("#txtMunicipalityZipCode", propertyMapping, "School_Data_MunicipalityZipCode");
                ApplyTextboxValue("#txtRecommenderFirstName", propertyMapping, "School_Data_RecommenderFirstName");
                ApplyTextboxValue("#txtRecommenderLastName", propertyMapping, "School_Data_RecommenderLastName");
                ApplyTextboxValue("#txtRecommenderRole", propertyMapping, "School_Data_RecommenderRole");
                ApplyPhoneNumberWithPrefix("#txtRecommenderPhonePrefix", "#txtRecommenderPhoneNumber", propertyMapping, "School_Data_RecommenderPhoneNumber");
                ApplyPhoneNumberWithPrefix("#txtRecommenderFaxPrefix", "#txtRecommenderFaxNumber", propertyMapping, "School_Data_RecommenderFax");
                ApplyTextboxValue("#txtRecommenderEmail", propertyMapping, "School_Data_RecommenderEmailAddress");
                ApplyBoardMembers("#tblBoardMembers", propertyMapping, ["ManagementBoardMember_$index_Name", "ManagementBoardMember_$index_Role"]);
                ApplyCourtHours("#tblCourtHours", propertyMapping, ["HostingDay_$sport_Category_$category_Name", "HostingDay_$sport_Category_$category_Weekday", "HostingDay_$sport_Category_$category_HostingHour"]);
                ApplyCoaches("#tblCoaches", propertyMapping, ["Coach_$index_SportField", "Coach_$index_Name", "Coach_$index_AgeRange", "Coach_$index_Gender", "Coach_$index_AuthorizationLevel",
                        "Coach_$index_PassedCoachTraining", "Coach_$index_Cellular", "Coach_$index_Address", "Coach_$index_Email"],
                    {"Coach_$index_AuthorizationLevel": "authorizationLevels", "Coach_$index_PassedCoachTraining": "yesNoOptions"});
                $timeout(function() {
                    var requestParams = {
                        ManagerName: propertyMapping['School_Data_ManagerName'],
                        PhoneNumber: propertyMapping['School_Data_PhoneNumber'],
                        FaxNumber: propertyMapping['School_Data_FaxNumber'],
                        ManagerEmail: propertyMapping['School_Data_ManagerEmail']
                    };
                    $http.post('/api/sportsman/school/personnel', requestParams).then(function() {
                        console.log('Data posted to server successfully');
                        var qs = sportUtils.ParseQueryString();
                        if (qs['preview'] == '1') {
                            console.log('preview mode');
                        } else {
                            RegisterSingleTeam(0, function() {
                                $http.delete('/api/school-club/team-order?category=all').then(function() {
                                    console.log('Orders basket cleared');
                                    if (window.opener) {
                                        window.opener["reload_orders_basket"] = "1";
                                    }
                                    //$("#btnPrint").click();
                                }, function(err) {
                                    console.log(err);
                                });
                            });
                        }
                    });
                }, 1000);

            }, function(err) {
                console.log('error reading school club data');
            });

            $http.get('/api/school-club/team-orders').then(function(resp) {
                $scope.schoolOrdersBasket = resp.data;
                $scope.schoolOrdersBasket.forEach(function(order, index) {
                    order.Index = index + 1;
                });
                window.setTimeout(function() {
                    InjectOrdersTable();
                }, 200);
            }, function(err) {
                console.log('error getting orders basket');
            });
        }

        if (isNaN(schoolSymbol) || schoolSymbol < 0) {
            $scope.error = 'אין סמל בית ספר';
        } else {
            var url = '/api/sportsman/data-gateway';
            $scope.loading = true;
            $http.get(url).then(function (resp) {
                url = resp.data;
                var rootUrl = url.substring(0, url.lastIndexOf("/") + 1);
                url += '?symbol=' + schoolSymbol;
                $http.get(url).then(function (resp) {
                    var rawHTML = resp.data;
                    $scope.loading = false;
                    $scope.RawHTML = $sce.trustAsHtml(rawHTML);
                    window.setTimeout(function() {
                        FixImages(rootUrl);
                    }, 500);
                    window.setTimeout(ApplyServerData, 50);
                }, function(err) {
                    $scope.error = 'שגיאה בעת טעינת נתוני בית ספר';
                    console.log(err);
                    $scope.loading = false;
                });
            }, function(err) {
                $scope.error = 'שגיאה בעת טעינת נתונים';
                console.log(err);
                $scope.loading = false;
            });
        }

        window['qL_steps_amount'] = 1;
        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);
    }

    function FixImages(rootUrl) {
        $("img").each(function() {
            var curImage = $(this);
            var currentSrc = curImage.attr("src");
            if (currentSrc.indexOf("http") != 0) {
                currentSrc = rootUrl + currentSrc;
                curImage.attr("src", currentSrc);
            }
        });
    }
})();