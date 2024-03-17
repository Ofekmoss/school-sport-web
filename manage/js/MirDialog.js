/**
 * Created by yahav on 01/04/2019.
 */
var MirDialog = {
    _rootPanelId: '',
    _confirmCallback: null,
    Init: function(rootPanelId) {
        MirDialog._rootPanelId = rootPanelId;
    },
    Show: function(title, bodyRawHTML) {
        var oDialog = $("#pnlCommonDialog");
        oDialog.find(".mir-dialog-title-contents").text(title);
        oDialog.find(".mir-dialog-body").html(bodyRawHTML);
        var oMainPanel = $("#" + MirDialog._rootPanelId);
        var dialogWidth = oDialog.width();
        var dialogHeight = oDialog.height();
        var totalWidth = $(window).width();
        var totalHeight = $(window).height();
        var dialogLeftPosition = parseInt(((totalWidth - dialogWidth) / 2) + 0.5);
        //console.log($(window).height());
        oDialog.css({
            "left": dialogLeftPosition + "px"
        });
        oDialog.show();
        oMainPanel.addClass("mir-gray-background");
        oMainPanel.find("input[type='text'],button,select,table").addClass("mir-dialog-open");
        oMainPanel.css("min-height", totalHeight + "px");
        MirDialog.AttachEvent('.mir-toggle-selection-container div', 'click', function(e) {
            var toggleSelectionItems = MirDialog.GetItems(".mir-toggle-selection-container div");
            toggleSelectionItems.removeClass("mir-selected-toggle-item");
            $(this).addClass("mir-selected-toggle-item");
        });
    },
    Close: function() {
        var oDialog = $("#pnlCommonDialog");
        var oMainPanel = $("#" + MirDialog._rootPanelId);
        $("#" + MirDialog._rootPanelId).removeClass("mir-gray-background");
        oMainPanel.find("input[type='text'],button,select,table").removeClass("mir-dialog-open");
        oDialog.hide();
    },
    BodyClicked: function(e) {
        if ($("#" + MirDialog._rootPanelId).hasClass("mir-gray-background")) {
            if (e == null || $(e.target).parents("#pnlCommonDialog").length == 0) {
                MirDialog.Close();
            }
        }
    },
    DocumentReady:function(e) {
        $(".mir-dialog-close-button").each(function() {
            var oButton = $(this);
            oButton.click(MirDialog.Close);
        });
    },
    AttachEvent: function(selector, eventName, handler) {
        var oDialog = $("#pnlCommonDialog");
        var dialogBody = oDialog.find(".mir-dialog-body");
        var element = dialogBody.find(selector);
        element.bind(eventName, handler)

    },
    AttachConfirmCallback: function(callback) {
        _confirmCallback = callback;
    },
    TriggerEvent: function(selector, eventName) {
        var oDialog = $("#pnlCommonDialog");
        var dialogBody = oDialog.find(".mir-dialog-body");
        var element = dialogBody.find(selector);
        element.trigger(eventName)

    },
    GetItems: function(selector) {
        var oDialog = $("#pnlCommonDialog");
        return oDialog.find(selector);
    },
    SelectedToggleItems: function() {
        var selectedItems = [];
        MirDialog.GetItems(".mir-selected-toggle-item").each(function() {
            selectedItems.push($(this));
        });
        return selectedItems;
    },
    ConfirmClicked: function(event) {
        if (MirDialog._confirmCallback != null) {
            MirDialog._confirmCallback(event);
        }
    }
};
