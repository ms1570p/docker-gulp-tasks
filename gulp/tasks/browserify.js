'use strict';

if(!config.tasks.browserify) return;

var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var browserSync = require('browser-sync');
var sourcemaps = require('gulp-sourcemaps');
var gzip = require('gulp-gzip');
var browserify = require('browserify');
var watchify = require('watchify');
var path = require('path');

var paths = {
    src: path.join(config.root.src, config.tasks.browserify.src),
    dest: path.join(config.root.dest, path.dirname(config.tasks.browserify.dest)),
    destBase: path.basename(config.tasks.browserify.dest)
};

function browserifyTask(watch) {
    var b = browserify({
        entries: paths.src,
        cache : {},
        packageCache: {}
    });

    if (watch) {
        b.plugin(watchify, {
            delay: 500,
            ignoreWatch: ['**/node_modules/**'],
            poll: true
        });
    }

    //iterate through every transform in config and call them
    for(var transform in config.tasks.browserify.transforms) {
        if (config.tasks.browserify.transforms.hasOwnProperty(transform)) {
            var options = config.tasks.browserify.transforms[transform];
            b.transform(options, require(transform));
        }
    }

    function bundle() {
        var stream = b.bundle();
        return stream.on('error', gutil.log)
            .pipe(source(paths.destBase))
            .pipe(buffer())
            .pipe(gulpif(global.development, sourcemaps.init()))
            .pipe(gulpif(!global.development, uglify()))
            .pipe(gulpif(global.development, sourcemaps.write()))
            .pipe(gulp.dest(paths.dest))
            .pipe(gulpif(!global.development && config.tasks.browserify.gzip, gzip())) //gzip AFTER output; this should keep the original files
            .pipe(gulpif(!global.development && config.tasks.browserify.gzip, gulp.dest(paths.dest))) //output gzipped files
            .pipe(gulpif(global.development, browserSync.stream()));
    }

    //only relevant for watchify
    b.on('update', function() {
        var startTime = Date.now();
        bundle();
        var diffTime = Date.now() - startTime;
        console.log("Finished 'browserify' after "+diffTime+" ms");
    });
    return bundle();
}

gulp.task('browserify', function() {
    return browserifyTask(false);
});

gulp.task('browserify:watch', function(){
    global.development = true;
    return browserifyTask(true);
});