//noinspection JSUnresolvedVariable
require('dotenv').config({
    path: `${process.env.HOME}/.gradle/gradle.properties`
});
var gulp = require('gulp');
var del = require('del');

require('./gulp-tasks/javascript');

gulp.task('default', ['build']);

gulp.task('build', ['javascript']);