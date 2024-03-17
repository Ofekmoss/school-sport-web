var gulp = require('gulp'),
    filter = require('gulp-filter'),
    addsrc = require('gulp-add-src'),
    flatmap = require('gulp-flatmap'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    wrap = require('gulp-wrap-file'),
    uglify = require('gulp-uglify'),
    merge = require('merge-stream'),
    concatCss = require('gulp-concat-css'),
    groupConcat = require('gulp-group-concat'),
    less = require('gulp-less');

var fs = require('fs');

var isWin = process.platform === "win32";
var pathSeparator = isWin ? '\\' : '/';

var production = false;

var vendor = {
    source: require('./vendor.json')
};

gulp.task('vendor', function () {
    var filterJs = filter('**/*.js', {restore: true});
    var filterCss = filter('**/*.css', {restore: true});
    var filterFonts = filter('**/fonts', {restore: true});

    return gulp.src(vendor.source, {allowEmpty: true})
        .pipe(filterJs)
        .pipe(concat('vendor.min.js'))
        .pipe(gulp.dest('dist/js'))
        .pipe(filterJs.restore)
        .pipe(filterCss)
        .pipe(concatCss('vendor.css', {rebaseUrls: false}))
        .pipe(gulp.dest('dist/css'))
        .pipe(filterCss.restore)
        .pipe(filterFonts)
        .pipe(flatmap(function (stream, file) {
            return gulp.src(file.path + '/*')
                .pipe(gulp.dest('dist/fonts'));
        }));
});

var imports = {
    source: require('./imports.json')
};

gulp.task('imports', function () {
    return gulp.src(imports.source, {allowEmpty: true})
        .pipe(gulp.dest('dist/js/imports'));
});

gulp.task('scripts', function () {
    /*var groups = {};

    var folders = fs.readdirSync('src/js').filter(function (x) { return fs.statSync('src/js/' + x).isDirectory(); });
    for (var i = 0; i < folders.length; i++) {
        var folder = folders[i];
        groups[folder + '.js'] = ['src/js/' + folder + '/** --- /*.js'];
    }

    var groupedStream = gulp.src(["src/js/** --- /*.js"])
        .pipe(groupConcat(groups))
        .pipe(gulp.dest('dist/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));

    var rootStream = gulp.src(["src/js/*.js"])
        .pipe(gulp.dest('dist/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));

    return merge(groupedStream, rootStream);*/

    return gulp.src(["src/js/**/*.js"])
        .pipe(gulp.dest('dist/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
});


gulp.task('templates', function () {
    var groups = {
        'default.js': ['src/templates/*.js']
    };

    var folders = fs.readdirSync('src/templates').filter(function (x) { return fs.statSync('src/templates/' + x).isDirectory(); });
    for (var i = 0; i < folders.length; i++) {
        var folder = folders[i];
        groups[folder + '.js'] = ['src/templates/' + folder + '/**/*.js'];
    }

    return gulp.src([
        'src/templates/**/*.html'
    ])
        .pipe(wrap({
            wrapper: function (content, file) {
                var i = file.modName.indexOf('templates');
                var pathName = file.modName.slice(i + 10);
                i = pathName.indexOf(pathSeparator);
                if (i >= 0) {
                    // Skipping module name
                    pathName = pathName.slice(i + 1);
                }
                i = pathName.lastIndexOf(pathSeparator);
                var name = i < 0 ? pathName : pathName.slice(i + 1);
                return 'TEMPLATES["' + name + '"] = ' + JSON.stringify(content) + ';\n';
            }
        }))
        .pipe(rename({extname: '.js'}))
        .pipe(groupConcat(groups))
        .pipe(wrap({
            wrapper: "define([], function() {\nvar TEMPLATES = {},\nLOCALS = {};\n{file}\nreturn TEMPLATES;\n});"
        }))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js/templates'));
});

gulp.task('views', function () {
    var viewsStream = gulp.src([
        'src/views/**/*.html'
    ])
        .pipe(gulp.dest('dist'));

    var cssStream = gulp.src(['src/css/**/*.less'])
        .pipe(less())
        .pipe(addsrc.append(['src/css/**/*.css']))
        .pipe(concatCss('style.css', {rebaseUrls: false}))
        .pipe(gulp.dest('dist/css'));

    return merge(viewsStream, cssStream);
});

gulp.task('watch', function () {
    gulp.watch(['vendor.json'], gulp.series('vendor'));
    gulp.watch(['imports.json'], gulp.series('imports'));
    gulp.watch(['src/js/**/*.js'], gulp.series('scripts'));
    gulp.watch(['src/templates/**/*.html'], gulp.series('templates'));
    gulp.watch(['src/views/**/*.html', 'src/css/**/*.css', 'src/css/**/*.less'], gulp.series('views'));
});

gulp.task('default', gulp.series('vendor', 'imports', 'templates', 'scripts', 'views', 'watch'));
gulp.task('build', gulp.series('vendor', 'imports', 'templates', 'scripts', 'views'));

