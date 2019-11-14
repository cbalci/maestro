/* Specify environment to include mocha globals */
/* eslint-env node, mocha */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;
// const PNG = require('pngjs').PNG; // attempted to use for PNG checking. See writePNG() below.

const TimelineWriter = require('../app/writer/timeline/TimelineWriter');
const Procedure = require('../app/model/Procedure');

const tests = [
	{
		file: 'cases/simple/procedures/proc.yml',
		expected: {
			columns: ['EV1', 'EV3'],
			actorToTimelineColumn: { EV1: 0, EV3: 1 }
		}
	},
	{
		file: 'cases/complex-times/procedures/proc.yml',
		expected: {
			columns: ['EV3', 'EV4', 'EV1', 'EV2'],
			actorToTimelineColumn: { EV3: 0, EV4: 1, EV1: 2, EV2: 3 }
		}
	}
];

function createProcedure(filepath) {
	const procedure = new Procedure();
	const err = procedure.populateFromFile(filepath);
	if (err) {
		throw new Error(err);
	}
	return procedure;
}

for (const test of tests) {
	const filepath = path.join(__dirname, test.file);

	// create the procedure associated with this file
	test.procedure = createProcedure(filepath);

	// Create Procedure.toJSON() to handle circular refs, then use it to determine idempotency here
	// create it again, for use in idempotency tests
	// test.expected.untouchedProcedure = createProcedure(test.file);

	test.timeline = new TimelineWriter(test.procedure);

	test.buildDir = path.join(filepath, '../../build');
}

describe('TimelineWriter', function() {

	describe('constructor', function() {
		for (const test of tests) {
			it(`should setup columns for ${test.file}`, function() {
				assert.deepEqual(test.timeline.columns, test.expected.columns);
				assert.deepEqual(
					test.timeline.actorToTimelineColumn,
					test.expected.actorToTimelineColumn
				);
			});
		}
	});

	describe('create()', function() {
		for (const test of tests) {

			test.timeline.create();
			const firstSVG = test.timeline.canvas.svg();

			test.timeline.create();
			const secondSVG = test.timeline.canvas.svg();

			it(`should be idempotent for ${test.file}`, function() {
				assert.equal(firstSVG, secondSVG);
			});
		}
	});

	describe('writeSVG()', function() {
		for (const test of tests) {

			// in case 'create()' tests haven't been run yet
			if (!test.timeline.canvas) {
				test.timeline.create();
			}

			const expectedPath = path.join(
				test.buildDir, `${test.procedure.filename}.summary.timeline.svg`
			);
			const testPath = path.join(
				test.buildDir, `test${test.procedure.filename}.summary.timeline.svg`
			);

			test.timeline.writeSVG(testPath);
			const expectedSVG = fs.readFileSync(expectedPath).toString();
			const testSVG = fs.readFileSync(testPath).toString();

			// NOTE: Do this outside the assert so when different a huge incomprehensible diff
			// doesn't get printed to the terminal
			const goodMsg = 'SVG generated by tests matches expected';
			const msg = (expectedSVG === testSVG) ?
				goodMsg :
				'SVG generated by tests DOES NOT match expected';

			it(`should create expected SVG for ${test.file}`, function() {
				assert.strictEqual(msg, goodMsg); // see NOTE above
			});
		}
	});

	/**
	 * This works locally, but fails when run in Travis CI. Perhaps the PNGs created in Travis are
	 * generated using different compression libraries. To attempt to get around this, pngjs was
	 * used to read the PNGs pixel-for-pixel, but that was also unsuccessful (though only moderate
	 * effort was given). The code below assumes pngjs is installed, but it may have been removed
	 * as a dependency at this point.
	describe('writePNG()', function() {
		for (const test of tests) {

			// in case 'create()' tests haven't been run yet
			if (!test.timeline.canvas) {
				test.timeline.create();
			}

			const expectedPath = path.join(
				test.buildDir, `${test.procedure.filename}.summary.timeline.png`
			);
			const testPath = path.join(
				test.buildDir, `test${test.procedure.filename}.summary.timeline.png`
			);

			it(`should create expected PNG for ${test.file}`, function(done) {
				test.timeline.writePNG(testPath, function() {
					// const expectedPNG = fs.readFileSync(expectedPath).toString();
					// const testPNG = fs.readFileSync(testPath).toString();
					const expectedPNG = PNG.sync.read(fs.readFileSync(expectedPath));
					const testPNG = PNG.sync.read(fs.readFileSync(testPath));

					// NOTE: Do this outside the assert so when different a huge incomprehensible
					// diff doesn't get printed to the terminal
					const goodMsg = 'PNG generated by tests matches expected';
					let msg = goodMsg;
					try {
						// If assertion fails, swallow exception to keep mocha from printing diff
						assert.deepEqual(testPNG, expectedPNG);
					} catch (failedAssertion) {
						msg = 'PNG generated by tests DOES NOT match expected';
					}

					assert.strictEqual(msg, goodMsg); // see NOTE above

					done();
				});
			});
		}
	});
	 */

});
