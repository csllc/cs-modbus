/*global module:false*/

var path = require('path');

module.exports = function(grunt)
{
  'use strict';

  var buildDir = './build/';
  var lcovInstrumentDir = './build/instrument/';
  var lcovReportDir = './build/coverage/';
  var srcLibForTestsDir = path.resolve(__dirname, 'lib/');
  var lcovLibForTestsDir = path.resolve(__dirname, lcovInstrumentDir, 'lib');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      coverage: [lcovInstrumentDir, lcovReportDir],
      all: buildDir
    },
    env: {
      default: {
        LIB_FOR_TESTS_DIR: srcLibForTestsDir
      },
      coverage: {
        LIB_FOR_TESTS_DIR: lcovLibForTestsDir
      }
    },
    jshint: {
      src: [
        './lib/**/*.js',
        './test/**/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    mochaTest: {
      src: './test/**/*.js',
      options: {
        ignoreLeaks: false,
        globals: ['should'],
        ui: 'bdd',
        reporter: 'dot'
      }
    },
    instrument: {
      files: './lib/**/*.js',
      options: {
        basePath : lcovInstrumentDir
      }
    },
    storeCoverage: {
      options: {
        dir: lcovReportDir
      }
    },
    makeReport: {
      src: lcovReportDir + 'coverage.json',
      options : {
        reporters: {
          lcov: {dir: lcovReportDir},
          text: true
        }
      }
    },

    browserify: {

      options: {
        //transform:  [ require('grunt-react').browserify ],
        browserifyOptions: {
          debug: true,
          standalone: 'Modbus'
        }
      },
      dev: {
        src: './lib/index.js',
        dest: './build/dev/cs-modbus.js'
      },
      dist: {
        src: './lib/index.js',
        dest: './build/dist/cs-modbus.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-istanbul');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('test', [
    'env:default',
    'mochaTest'
  ]);

  grunt.registerTask('coverage', [
    'clean:coverage',
    'env:coverage',
    'instrument',
    'mochaTest',
    'storeCoverage',
    'makeReport'
  ]);

  grunt.registerTask('distribution', [
    'browserify'
  ]);

  grunt.registerTask('default', [
    'clean',
    'jshint',
    'coverage',
    'distribution'
  ]);

};

