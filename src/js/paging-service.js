var __psAvailablePageSizes = [5, 10, 20, 50, 100];
var __psDefaultPageSize = 50;
var __psDefaultOptions = {
    pageSize: __psDefaultPageSize,
    applyDataCallback: null
};
var __psUniqueCounter = 0;

function PagingService(data, options) {
    var _this = this;
    this.options = typeof options == 'undefined' ? __psDefaultOptions : options;
    for (var key in __psDefaultOptions) {
        if (!this.options.hasOwnProperty(key)) {
            this.options[key] = __psDefaultOptions[key];
        }
    }
    this.__source = null;
    this.rawData = data;

    this.itemsCount = function() {
        return (this.rawData || []).length;
    };

    this.getAllData = function() {
        return (this.rawData || []).slice(0);
    };

    this.parsePageSize = function(rawValue) {
        var size = parseInt(rawValue, 10);
        if (isNaN(size))
            size = this.options.pageSize;
        var exists = false;
        var allSizes = this.availablePageSizes();
        for (var i = 0; i < allSizes.length; i++) {
            var curSize = allSizes[i];
            if (size == curSize) {
                exists = true;
                break;
            }
        }
        if (!exists)
            size = this.options.pageSize;
        return size;
    };

    this.availablePageSizes = function() {
        var sizes = [];
        for (var i = 0; i < __psAvailablePageSizes.length; i++)
            sizes.push(__psAvailablePageSizes[i]);
        var itemCount = (this.rawData || []).length;
        var lastIndex = 0;
        for (var i = 0; i < sizes.length; i++) {
            if (sizes[i] >= itemCount) {
                lastIndex = i + 1;
                break;
            }
        }
        if (lastIndex > 0 && lastIndex < sizes.length)
            sizes.splice(lastIndex);
        return sizes;
    };

    this.getPageCount = function(size) {
        var totalItems = this.itemsCount();
        var pageCount = Math.ceil(totalItems / size);
        return pageCount > 0 ? pageCount : 1;
    };

    this.isPageIncluded = function(page, curPage, pageCount) {
        if (page == 1 || page == pageCount)
            return true;
        var medianPage = curPage;
        if (medianPage < 3)
            medianPage = 3;
        if (medianPage > (pageCount - 2))
            medianPage = (pageCount - 2);
        return (page == medianPage) || (page == (medianPage - 1)) || (page == (medianPage + 1));
    };

    this.getPages = function(size, curPage) {
        var pageCount = this.getPageCount(size);
        var pages = [];
        for (var i = 1; i <= pageCount; i++) {
            var page = i;
            if (this.isPageIncluded(page, curPage, pageCount))
                pages.push(page);
        }
        return pages;
    };

    this.parseCurrentPage = function(rawValue, size) {
        if (typeof rawValue == 'undefined' || typeof size == 'undefined')
            return 1;
        var page = parseInt(rawValue, 10);
        var pageCount =  this.getPageCount(size);
        return (isNaN(page) || page < 1 || page > pageCount) ? 1 : page;
    };

    this.changePageSize = function(newSize) {
        _this.pageSize = newSize;
        _this.applyPaging(_this.__source);
        if (_this.currentPage > 1)
            _this.changePage(1);
    };

    this.changePage = function(newPage) {
        _this.currentPage = newPage;
        _this.applyPaging(_this.__source);
    };

    this.nextPage = function() {
        if (this.pagingData.isLastPage)
            return;

        var newPage = _this.currentPage + 1;
        _this.changePage(newPage);
    };

    this.previousPage = function() {
        if (this.pagingData.isFirstPage)
            return;

        var newPage = parseInt(_this.currentPage || 0) - 1;
        _this.changePage(newPage);
    };

    this.setData = function(data, source) {
        this.rawData = data;
        if (typeof source != 'undefined' && source)
            this.__source = source;
        this.applyPaging(this.__source);
        if (this.currentPage > 1)
            this.changePage(1);
    }

    this.applyPaging = function(source) {
        if (!this.rawData)
            this.rawData = [];

        if (source == null)
            source = [];

        this.__source = source;
        source.splice(0, source.length);

        var size = this.parsePageSize(this.pageSize);
        var curPage = this.parseCurrentPage(this.currentPage, size);
        this.currentPage = curPage;
        this.pageSize = size;
        var items = [];
        var firstIndex = (this.currentPage - 1) * size;
        var lastIndex = firstIndex + size;
        if (lastIndex > this.rawData.length)
            lastIndex = this.rawData.length

        if (this.rawData.length > 0) {
            for (var i = firstIndex; i < lastIndex; i++) {
                items.push(this.rawData[i]);
            }
        }

        this.pagingData = {
            gotPaging: items.length < this.itemsCount(),
            firstRecord: firstIndex + 1,
            lastRecord: firstIndex + items.length,
            totalRecords: this.itemsCount(),
            pageSizes: this.availablePageSizes(),
            selectedPage: this.currentPage,
            selectedPageSize: this.pageSize,
            isFirstPage: this.currentPage == 1,
            isLastPage: this.currentPage == this.getPageCount(this.pageSize),
            pages: this.getPages(this.pageSize, this.currentPage),
            pageCount: this.getPageCount(this.pageSize)
        };

        for (var i = 0; i < items.length; i++) {
            source.push(items[i]);
        }

        if (this.options.applyDataCallback)
            this.options.applyDataCallback();
    };
}