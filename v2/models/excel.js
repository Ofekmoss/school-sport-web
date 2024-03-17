// var XLSX = require('xlsx');

var ExcelZeroDate = new Date(1899, 11, 30).getTime();
var SecondsInADay = 24 * 60 * 60;

var DefaultDateTimeFormat = "DD/MM/YY\\ HH:MM";
var DefaultDateFormat = "DD/MM/YY";

function getExcelDateTimeValue(value) {
    return Math.floor((value.getTime() - ExcelZeroDate) / 24 / 60 / 60000) +
        (value.getHours() * 3600 + value.getMinutes() * 60 + value.getSeconds()) / SecondsInADay;
}

function ExcelColumn(columnIndex) {
    this.columnIndex = columnIndex;
}

ExcelColumn.prototype.toString = function () {
    if (this.column == null) {
        this.column = XLSX.utils.encode_col(this.columnIndex);
    }
    return this.column;
};

function getColumnIndex(col) {
    if (col != null) {
        if (col.columnIndex != null) {
            return col.columnIndex;
        }

        return col
    }
    return null;
}

function ExcelSheet(workbook) {
    this.sheet = {
        "!cols": [],
        "!merges": []
    };
    this.workbook = workbook;
    this.lastCell = {c: 0, r: 0};
    this.currentCell = {c: 0, r: 0};
    this.currentStyle = null;
}

ExcelSheet.prototype.updateRef = function (col, row) {
    col = getColumnIndex(col);
    var update = false;
    if (col > this.lastCell.c) {
        this.lastCell.c = col;
        update = true;
    }
    if (row > this.lastCell.r) {
        this.lastCell.r = row;
        update = true;
    }
    if (update) {
        this.sheet["!ref"] = "A1:" + XLSX.utils.encode_cell(this.lastCell);
    }
};

ExcelSheet.prototype.ensureCol = function(col) {
    var cols = this.sheet["!cols"];
    while (cols.length <= col) {
        cols.push({});
    }
    this.updateRef(col);
};

ExcelSheet.prototype.width = function (col, wch) {
    col = getColumnIndex(col);
    this.ensureCol(col);
    this.sheet["!cols"][col].wch = wch;
    return this;
};

ExcelSheet.prototype.cell = function (col, row) {
    col = getColumnIndex(col);
    this.currentCell = {c: col, r: row};
    this.ensureCol(col);
    this.updateRef(col, row);
    return this;
};

ExcelSheet.prototype.style = function(style) {
    this.currentStyle = style;
    return this;
};

ExcelSheet.prototype.col = function (col) {
    col = getColumnIndex(col);
    this.currentCell.c = col;
    this.ensureCol(col);
    return this;
};

ExcelSheet.prototype.nextCol = function () {
    this.currentCell.c++;
    this.ensureCol(this.currentCell.c);
    return this;
};

ExcelSheet.prototype.row = function (row) {
    this.currentCell.r = row;
    this.updateRef(null, row);
    return this;
};

ExcelSheet.prototype.nextRow = function () {
    this.currentCell.r++;
    this.updateRef(null, this.currentCell.r);
    return this;
};

ExcelSheet.prototype.merge = function (startCol, startRow, endCol, endRow) {
    this.sheet['!merges'].push({
        s: {c: startCol, r: startRow},
        e: {c: endCol, r: endRow}
    });
    return this;
};

ExcelSheet.prototype.colSpan = function (count) {
    this.sheet['!merges'].push({
        s: {c: this.currentCell.c, r: this.currentCell.r},
        e: {c: this.currentCell.c + count - 1, r: this.currentCell.r}
    });
    return this;
};

ExcelSheet.prototype.rowSpan = function (count) {
    this.sheet['!merges'].push({
        s: {c: this.currentCell.c, r: this.currentCell.r},
        e: {c: this.currentCell.c, r: this.currentCell.r + count - 1}
    });
    return this;
};

ExcelSheet.prototype.height = function(lines) {
    var i = this.sheet[XLSX.utils.encode_cell(this.currentCell)];
    if (i) {
        i.ht = 15*lines;
    }
    return this;
};

ExcelSheet.prototype.format = function (format) {
    var i = this.sheet[XLSX.utils.encode_cell(this.currentCell)];
    if (i) {
        i.z = format;

        this.workbook.useFormat(format);
    }
    return this;
};

ExcelSheet.prototype.cellStyle = function(style) {
    var cell = XLSX.utils.encode_cell(this.currentCell);
    var i = this.sheet[cell];
    if (!i) {
        this.sheet[cell] = i = {v: ''};
    }
    if (!i.s) {
        if (this.currentStyle) {
            i.s = this.currentStyle;
        }
        else {
            i.s = {};
        }
    }

    if (style) {
        var n = {};
        for (var key in i.s) {
            n[key] = i.s;
        }
        for (var key in style) {
            n[key] = style[key];
        }
        i.s = n;
    }

    return this;
};

ExcelSheet.prototype.string = function(value) {
    var i = {v: value || ''};
    if (this.currentStyle) {
        i.s = this.currentStyle;
    }
    this.sheet[XLSX.utils.encode_cell(this.currentCell)] = i;
    return this;
};

ExcelSheet.prototype.formula = function(formula) {
    var i = {t: 'n', f: formula, v: ''};
    if (this.currentStyle) {
        i.s = this.currentStyle;
    }
    this.sheet[XLSX.utils.encode_cell(this.currentCell)] = i;
    return this;
};

ExcelSheet.prototype.encodeCol = function (columnIndex) {
    return XLSX.utils.encode_col(columnIndex);
};

ExcelSheet.prototype.encodeRow = function (rowIndex) {
    return XLSX.utils.encode_row(rowIndex);
};

ExcelSheet.prototype.encodeCell = function (columnIndex, rowIndex) {
    return XLSX.utils.encode_cell({c: columnIndex, r: rowIndex});
};

ExcelSheet.prototype.number = function(value) {
    var i = {t: 'n', v: value};
    if (this.currentStyle) {
        i.s = this.currentStyle;
    }
    this.sheet[XLSX.utils.encode_cell(this.currentCell)] = i;
    return this;
};

ExcelSheet.prototype.dateTime = function(value) {
    if (value) {
        this.workbook.useFormat(DefaultDateTimeFormat);
        var i = {t: 'n', v: getExcelDateTimeValue(value), z: DefaultDateTimeFormat};
        if (this.currentStyle) {
            i.s = this.currentStyle;
        }
        this.sheet[XLSX.utils.encode_cell(this.currentCell)] = i;
    }
    return this;
};

ExcelSheet.prototype.date = function(value) {
    if (value) {
        this.workbook.useFormat(DefaultDateFormat);
        var i = {t: 'n', v: getExcelDateTimeValue(value), z: DefaultDateFormat};
        if (this.currentStyle) {
            i.s = this.currentStyle;
        }
        this.sheet[XLSX.utils.encode_cell(this.currentCell)] = i;
    }
    return this;
};

function Excel() {
    this.workbook = {
        Sheets: {},
        SheetNames: [],
        SSF: {}
    };
    this.addedFormats = {};
}

Excel.prototype.sheet = function (name) {
    var sheet = new ExcelSheet(this);
    this.workbook.Sheets[name] = sheet.sheet;
    this.workbook.SheetNames.push(name);
    return sheet;
};

Excel.prototype.useFormat = function (format) {
    if (!this.addedFormats[format]) {
        var n = 164;
        while (this.workbook.SSF[n]) {
            n++;
        }
        this.workbook.SSF[n] = format;
        this.addedFormats[format] = true;
    }
};

Excel.prototype.saveAs = function (fileName) {
    try {

        /*console.log(this.workbook);
        var data = XLSX.write(this.workbook,
            { bookType:'xlsx', type:'binary' });

        var buf = new ArrayBuffer(data.length);
        var view = new Uint8Array(buf);
        for (var i=0; i!=data.length; ++i) view[i] = data.charCodeAt(i) & 0xFF;


        /* the saveAs call downloads a file on the local machine */
        //saveAs(new Blob([buf],{type:""}), fileName);

        XLSX.writeFileSync(this.workbook, fileName);
    } catch (ex) {
        console.log(ex);
        return false;
    }
    return true;
};

module.exports = {
    create: function () {
        return new Excel();
    },
    col: function (columnIndex) {
        return new ExcelColumn(columnIndex);
    }
};