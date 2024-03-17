var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concatCss = require('gulp-concat-css'),
    notify = require('gulp-notify');

gulp.task('vendor-js', function () {
    return gulp.src([
            'bower_components/angular/angular.js',
            'bower_components/angular-ui-router/release/angular-ui-router.min.js',
            'bower_components/bootstrap/dist/js/bootstrap.min.js',
            'bower_components/ng-tags-input/ng-tags-input.min.js',
            'bower_components/angular-sanitize/angular-sanitize.min.js',
            'bower_components/angular-cookies/angular-cookies.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'bower_components/angular-ui-select/dist/select.min.js',
            'vendor/owl-carousel/owl.carousel.js',
            'vendor/jackbox/jackbox-packed.min.js',
            'vendor/flexslider/jquery.flexslider-min.js'
        ])
        .pipe(concat('vendor.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('v1/js'));
});

gulp.task('vendor-css', function () {
    return gulp.src([
            'bower_components/bootstrap/dist/css/bootstrap.min.css',
            'bower_components/ng-tags-input/ng-tags-input.min.css',
            'bower_components/angular-ui-select/dist/select.min.css',
            'vendor/owl-carousel/owl.carousel.css',
            'vendor/owl-carousel/owl.theme.green.css',
            'vendor/jackbox/jackbox.min.css',
            'vendor/flexslider/flexslider.css'
        ])
        .pipe(concatCss('vendor.min.css'))
        .pipe(gulp.dest('v1/css'));
});

gulp.task('vendor', ['vendor-js', 'vendor-css']);

gulp.task('plugins-js', function () {
    return gulp.src([
        'plugins/dropzone.js',
        'plugins/jquery.queryloader2.min.js',
        'plugins/misc-plugins.js',
        'plugins/retina.js',
        'plugins/jquery.themepunch.tools.min.js',
        'plugins/jquery.themepunch.revolution.min.js',
        'plugins/revija.js',
        'plugins/jquery.fancybox.js'
    ])
        .pipe(concat('plugins.js'))
        .pipe(gulp.dest('v1/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('v1/js'));
});

gulp.task('plugins', ['plugins-js']);

gulp.task('external-js', function () {
    return gulp.src([
        'external-js/*.js'
    ])
        .pipe(concat('external.js'))
        .pipe(gulp.dest('v1/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('v1/js'));
});

gulp.task('external', ['external-js']);

gulp.task('styles', function () {
    return gulp.src([
            'src/css/**/*.css'
        ])
        .pipe(concatCss('style.min.css'))
        .pipe(gulp.dest('v1/css'));
});

gulp.task('scripts', function () {
    return gulp.src([
            'src/js/sport.module.js',
            'src/js/**/*.module.js',
            'src/js/**/*.js'
        ])
        //.pipe(jshint('.jshintrc'))
        //.pipe(jshint.reporter('default'))
        .pipe(concat('sport.js'))
        .pipe(gulp.dest('v1/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('v1/js'));
});

gulp.task('default', ['scripts', 'styles', 'vendor', 'plugins', 'external']);

var watcher = gulp.watch(['src/js/*.js', 'src/js/**/*.js', 'src/css/**/*.css', 'vendor/**/*.js', 'vendor/**/*.css', 'plugins/**/*.js'],
    ['default']);

watcher.on('change', function (event) {
    console.log(event.path + ' ' + event.type);
});
