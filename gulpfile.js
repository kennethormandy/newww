var gulp = require('gulp'),
    nib = require('nib'),
    stylus = require('gulp-stylus'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    bistre = require('bistre'),
    nodemon = require('gulp-nodemon'),
    rename = require('gulp-rename');

var paths = {
  fonts: ['./assets/fonts/*'],
  styles: ['./assets/styles/*.styl'],
  scripts: {
    browserify: ["./assets/scripts/*.js"],
    vendor: ["./assets/scripts/vendor/*.js"]
  }
};

gulp.task('watch', function(){
  gulp.watch(paths.fonts, ['fonts']);
  gulp.watch(paths.styles, ['styles']);
  gulp.watch(paths.scripts.browserify, ['browserify']);
  gulp.watch(paths.scripts.vendor, ['concat']);
});

gulp.task('styles', function () {
  gulp.src('./assets/styles/index.styl')
    .pipe(stylus({use: [nib()]}))
    .pipe(gulp.dest('static/css/'))
});

gulp.task('browserify', function () {
  browserify("./assets/scripts/index.js")
    .bundle()
    .pipe(source('index.js'))
    .pipe(gulp.dest('static/js/'))
    .pipe(rename('index.min.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('static/js/'));
});

gulp.task('concat', function () {
  gulp.src(paths.scripts.vendor)
    .pipe(uglify())
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest('static/js/'))
});

gulp.task('fonts', function(){
  gulp.src(paths.fonts)
  .pipe(gulp.dest('static/fonts'));
})

gulp.task('nodemon', function() {
  process.env.NODE_ENV = 'dev';
  nodemon({
    script: 'server.js',
    ext: 'hbs js',
    ignore: [
      'assets/',
      'facets/*/test/',
      'node_modules/',
      'static/',
      'test/',
    ],
    stdout: false,
  })
    .on('readable', function () {
      this.stdout
        .pipe(bistre({time: true}))
        .pipe(process.stdout);
      this.stderr
        .pipe(bistre({time: true}))
        .pipe(process.stderr);
    });
});

gulp.task('build', ['fonts', 'styles', 'browserify', 'concat']);
gulp.task('dev', ['build', 'nodemon', 'watch']);
gulp.task('default', ['build']);
