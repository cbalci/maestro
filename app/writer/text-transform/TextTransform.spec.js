/* Specify environment to include mocha globals */
/* eslint-env node, mocha */

'use strict';

const expect = require('chai').expect;
const assert = require('chai').assert; // changing to assert
const docx = require('docx');
const TextTransform = require('./TextTransform.js');

/**
 * Positive testing for task
 */
describe('TextTransform', function() {
	describe('#constructor', () => {
		it('should set the format', () => {
			const tx = new TextTransform('docx');
			expect(tx.format).to.equal('docx');
		});

		it('should error if an invalid format is supplied', () => {
			const badConstructor = function() {
				new TextTransform('this-is-an-invalid-format'); // eslint-disable-line no-new
			};
			expect(badConstructor).to.throw();
		});
	});

	describe('#htmlColor', () => {
		const tx = new TextTransform('html');

		it('should return the color text in a formatted <span>', () => {
			expect(tx.htmlColor('GREEN'))
				.to.equal('<span style="font-weight:bold;color:green;">GREEN</span>');
			expect(tx.htmlColor('RED'))
				.to.equal('<span style="font-weight:bold;color:red;">RED</span>');
			expect(tx.htmlColor('YELLOW'))
				.to.equal('<span style="font-weight:bold;color:yellow;">YELLOW</span>');
		});
	});

	describe('#transform', () => {
		const tx = new TextTransform('html');
		const txDocx = new TextTransform('docx');

		it('should convert a single item without added whitespace', () => {
			const xformed = tx.transform('GREEN');
			expect(xformed).to.be.an('array');
			expect(xformed).to.eql([
				'<span style="font-weight:bold;color:green;">GREEN</span>'
			]);
			expect(xformed.join(''))
				.to.equal('<span style="font-weight:bold;color:green;">GREEN</span>');
		});

		it('should convert colors to html', () => {
			const xformed = tx.transform('GREEN RED GREEN RED');
			expect(xformed).to.be.an('array');
			expect(xformed).to.eql([
				'<span style="font-weight:bold;color:green;">GREEN</span>',
				' ',
				'<span style="font-weight:bold;color:red;">RED</span>',
				' ',
				'<span style="font-weight:bold;color:green;">GREEN</span>',
				' ',
				'<span style="font-weight:bold;color:red;">RED</span>'
			]);
		});

		it('should convert symbols to html', () => {
			const conversions = [
				// items that will be converted
				['{{CHECK}}', '✓'],
				['{{CHECKBOX}}', '☐'],
				['{{CHECKEDBOX}}', '☑'],
				['{{LEFT}}', '←'],
				['{{RIGHT}}', '→'],
				['ANCHOR', '<span style="font-weight:bold;color:black;">ANCHOR</span>'],

				// items that will not be converted, add 3rd item "true". See below for explanation.
				[' ', ' ', true],
				['some text', 'some text', true],
				[' other text ', ' other text ', true]
			];
			let input = '';
			const expectedOutput = [];
			let priorItemNonConverted = false;

			for (let i = 0; i < 1500; i++) {
				// get a random item from the list of conversions
				const item = conversions[Math.floor(Math.random() * conversions.length)];

				// For input construct a string
				input += item[0];

				// for expected output, construct an array. Items that do NOT get converted by
				// doTransform() should not create a new array item if they are adjacent, i.e. if an
				// string "no convert.no convert.no convert." was generated by three instances of
				// "no convert.", you'd want the array to be ["no convert.no convert.no convert."]
				// not ["no convert.", "no convert.", "no convert."]
				if (item[2] && priorItemNonConverted) {
					expectedOutput[expectedOutput.length - 1] += item[1];
				} else {
					expectedOutput.push(item[1]);
				}
				priorItemNonConverted = item[2];
			}

			const xformed = tx.transform(input);
			expect(xformed).to.be.an('array');
			expect(xformed.join('')).to.equal(expectedOutput.join(''));
			expect(xformed).to.eql(expectedOutput);
		});

		it('should create docx symbols', () => {
			const xformed = txDocx.transform('This is a {{CHECKBOX}}');
			expect(xformed).to.be.an('array');
			expect(xformed).to.eql([
				new docx.TextRun('This is a '),
				new docx.SymbolRun('F071')
			]);
		});

		it('should create make capitalized colors bold and colorized', () => {
			const xformed = txDocx.transform('REDGREENBLUEYELLOW');
			expect(xformed).to.be.an('array');
			expect(xformed).to.eql([
				new docx.TextRun({
					text: 'RED',
					bold: true,
					color: 'red'
				}),
				new docx.TextRun({
					text: 'GREEN',
					bold: true,
					color: 'green'
				}),
				new docx.TextRun({
					text: 'BLUE',
					bold: true,
					color: 'blue'
				}),
				new docx.TextRun({
					text: 'YELLOW',
					bold: true,
					color: '#FFC000'
				})
			]);
		});

		const templateCalls = [
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY | a template | call }} right here',
				expected: 'This is ✓ a templatecall right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY    |    a template    |    call }} right here',
				expected: 'This is ✓ a templatecall right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY|a GREEN }} right here',
				expected: 'This is ✓ a <span style="font-weight:bold;color:green;">GREEN</span> right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY|a GREEN}} right here',
				expected: 'This is ✓ a <span style="font-weight:bold;color:green;">GREEN</span> right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY|a {{DOWN}} }} right here',
				expected: 'This is ✓ a ↓ right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY|a {{DOWN}}}} right here',
				expected: 'This is ✓ a ↓ right here'
			},
			{
				template: 'VERIFY',
				input: 'This is {{VERIFY|a {{ }}{{ {{{{{{}}}}}}}} { }{} {{}} }} right here',
				expected: 'This is ✓ a {{ }}{{ {{{{{{}}}}}}}} { }{} {{}} right here'
			}

			// FIXME neither of these work yet, since you can't have templates with parameters as
			// arguments to another template, since the first one splits on all pipes (|)
			// {
			// template: 'VERIFY',
			// input: 'This is {{VERIFY|{{FAKE1|{{FAKE1|{{FAKE1|{{CHECKEDBOX}}}}}}}}}} right here',
			// expected: 'This is ✓ ✓ ✓ ✓ ☑ right here'
			// },
			// {
			// template: 'VERIFY',
			// input: 'This is {{VERIFY|{{VERIFY|{{VERIFY|{{CHECKEDBOX}}}}}} }} right here',
			// expected: 'This is ✓ ✓ ✓ ☑ right here'
			// }
		];

		let i = 0;
		for (const testCase of templateCalls) {
			it(`should properly handle ${testCase.template} template test ${i}`, function() {
				const xformed = tx.transform(testCase.input);
				assert.isArray(xformed);
				assert.strictEqual(xformed.join(''), testCase.expected);
			});
			i++;
		}
	});
});
