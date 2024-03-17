define([],function(){var e={};return e["club-teams-approval"]='<div class="vertical-flex" style="position: absolute; left: 0px; right: 0px;">\r\n    <div class="ph-lg pt-lg">\r\n        <div class="float-right">\r\n            <strong>\r\n                אישור מפקח\r\n            </strong>\r\n        </div>\r\n        <div class="float-left" v-bind:style="{border: user.delegatedUser != null ? \'1px dashed black\' : \'\',\r\n            padding: user.delegatedUser != null ? \'5px 5px 5px 5px\' : \'inherit\'}">\r\n            <strong v-if="user.delegatedUser">\r\n                {{user.delegatedUser.name}}\r\n                &larr;\r\n                מחובר בתור\r\n                &larr;\r\n            </strong>\r\n            <strong>\r\n                {{user.name}}\r\n            </strong>\r\n            <strong style="color: blue; cursor: pointer" v-on:click="logout()">\r\n                התנתק\r\n            </strong>\r\n        </div>\r\n    </div>\r\n\r\n    <div class="flex-fill ph-lg pv-sm">\r\n        <div class="panel p-sm" style="width: auto; position: absolute; left: 39px; right: 39px; top: 13px; bottom: 0px;">\r\n            <data-table v-bind:enableExport="true" v-bind:columns="columns" v-bind:data="teams" v-on:selection-change="handleSelectionChange()">\r\n                <div>\r\n                    <label>סטטוס</label>\r\n                    \x3c!--\r\n                    <select  style="width: 100%;" v-model="selectedStatus" v-on:change="changeStatus()">\r\n                        <option v-for="(status, index) in statuses" v-bind:value="status.id">{{status.name}}</option>\r\n                    </select>\r\n                    --\x3e\r\n                    <div class="btn-group">\r\n                        <button class="btn-link small" v-bind:disabled="selectedTeams.length == 0" v-bind:class="{active: selectedStatus == 0}" v-on:click="changeStatus(0)">ממתין לאישור</button>\r\n                        <button class="btn-link small" v-bind:disabled="selectedTeams.length == 0" v-bind:class="{active: selectedStatus == 1}" v-on:click="changeStatus(1)">אושר</button>\r\n                        <button class="btn-link small" v-bind:disabled="selectedTeams.length == 0" v-bind:class="{active: selectedStatus == -1}" v-on:click="changeStatus(-1)">לא אושר</button>\r\n                    </div>\r\n                </div>\r\n                <div v-if="loggedUser && loggedUser.region === 0">\r\n                    <label>מחוז</label>\r\n                    <select  style="width: 100%;" v-model="selectedRegion">\r\n                        <option value="-1">כל המחוזות</option>\r\n                        <option v-for="region in regions" v-bind:value="region.id">{{region.name}}</option>\r\n                    </select>\r\n                </div>\r\n                <div>\r\n                    <label>ענף</label>\r\n                    <select  style="width: 100%;" v-model="selectedSportField">\r\n                        <option value="0">כל הענפים</option>\r\n                        <option v-for="sportField in sportFields" v-bind:value="sportField.id">{{sportField.name}}</option>\r\n                    </select>\r\n                </div>\r\n                <div>\r\n                    <label>אליפות</label>\r\n                    <select  style="width: 100%;" v-model="selectedChampionship">\r\n                        <option value="0">כל האליפויות</option>\r\n                        <option v-for="championship in championships" v-bind:value="championship.id">{{championship.name}}</option>\r\n                    </select>\r\n                </div>\r\n                <div>\r\n                    <label>קטגוריה</label>\r\n                    <select  style="width: 100%;" v-model="selectedCategory">\r\n                        <option value="">כל הקטגוריות</option>\r\n                        <option v-for="category in categories" v-bind:value="category.name">{{category.name}}</option>\r\n                    </select>\r\n                </div>\r\n            </data-table>\r\n        </div>\r\n    </div>\r\n\r\n</div>',e});