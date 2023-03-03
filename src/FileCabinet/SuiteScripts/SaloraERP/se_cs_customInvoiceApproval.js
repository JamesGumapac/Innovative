/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/ui/message'],

	function(message) {

		/**
		 * Function to be executed after page is initialized.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
		 *
		 * @since 2015.2
		 */
		function pageInit(scriptContext) {

			var currentRecord = scriptContext.currentRecord;

			var action = currentRecord.getValue({ fieldId: 'custpage_action' });


			jQuery('body').hide();
			var html = jQuery('.uir-header-buttons').parent().parent().parent().html();
			jQuery('.uir-header-buttons').parent().parent().parent().parent().parent()
				.parent().append('<tr><td align="right"><table border="0" cellspacing="0" cellpadding="0" role="presentation">' +
				html + '</table></td></tr>');

			if (jQuery('.disclaimer').length > 0)
				jQuery('.disclaimer').html(jQuery('.disclaimer').html().replace(/\n/gi,'<br/>'));

			setTimeout(function(){
				jQuery('.uir-page-title').parent().attr('align','right');
				jQuery('.uir-record-type').parent().css('margin-right','45px');
				jQuery('.uir-header-buttons').attr('align','right');
				jQuery('img').css('margin-top', '-100px');
				jQuery('#div__body>table').css('margin-top','30px')
				jQuery('body').show();
			},500);

			if(action){
				message.create({
					title: 'Confirmation',
					message: 'Invoice successfully ' + (action == 'approve'? 'Approved': 'Rejected'),
					type: message.Type.CONFIRMATION
				}).show();
			}

			setTimeout(function(){
				window.history.pushState(null, "", window.location.href);
				window.onpopstate = function() {
					window.history.pushState(null, "", window.location.href);
				};
			},2000);

			//AGING
			var currentAging = currentRecord.getValue({ fieldId: 'custpage_current_aging' });
			var days30 = currentRecord.getValue({ fieldId: 'custpage_days30' });
			var days60 = currentRecord.getValue({ fieldId: 'custpage_days60' });
			var days90 = currentRecord.getValue({ fieldId: 'custpage_days90' });
			var morethan90Days = currentRecord.getValue({ fieldId: 'custpage_morethan90days' });
			var amountremaining = currentRecord.getValue({ fieldId: 'custpage_amountremaining' });

			jQuery( document ).ready(function() {
				jQuery(".age-current").append('$'+Number(parseFloat(currentAging).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));
				jQuery(".age-30").append('$'+Number(parseFloat(days30).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));
				jQuery(".age-60").append('$'+Number(parseFloat(days60).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));
				jQuery(".age-90").append('$'+Number(parseFloat(days90).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));
				jQuery(".age-more90").append('$'+Number(parseFloat(morethan90Days).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));
				jQuery(".age-remaining").append('$'+Number(parseFloat(amountremaining).toFixed(2)).toLocaleString('en', {minimumFractionDigits: 2}));

				jQuery("pagenumber").hide();
			});
		}

		/**
		 * Function to be executed when field is changed.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 * @param {string} scriptContext.fieldId - Field name
		 * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
		 * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
		 *
		 * @since 2015.2
		 */
		function fieldChanged(scriptContext) {

		}

		/**
		 * Function to be executed when field is slaved.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 * @param {string} scriptContext.fieldId - Field name
		 *
		 * @since 2015.2
		 */
		function postSourcing(scriptContext) {

		}

		/**
		 * Function to be executed after sublist is inserted, removed, or edited.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 *
		 * @since 2015.2
		 */
		function sublistChanged(scriptContext) {

		}

		/**
		 * Function to be executed after line is selected.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 *
		 * @since 2015.2
		 */
		function lineInit(scriptContext) {

		}

		/**
		 * Validation function to be executed when field is changed.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 * @param {string} scriptContext.fieldId - Field name
		 * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
		 * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
		 *
		 * @returns {boolean} Return true if field is valid
		 *
		 * @since 2015.2
		 */
		function validateField(scriptContext) {

		}

		/**
		 * Validation function to be executed when sublist line is committed.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 *
		 * @returns {boolean} Return true if sublist line is valid
		 *
		 * @since 2015.2
		 */
		function validateLine(scriptContext) {

		}

		/**
		 * Validation function to be executed when sublist line is inserted.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 *
		 * @returns {boolean} Return true if sublist line is valid
		 *
		 * @since 2015.2
		 */
		function validateInsert(scriptContext) {

		}

		/**
		 * Validation function to be executed when record is deleted.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @param {string} scriptContext.sublistId - Sublist name
		 *
		 * @returns {boolean} Return true if sublist line is valid
		 *
		 * @since 2015.2
		 */
		function validateDelete(scriptContext) {

		}

		/**
		 * Validation function to be executed when record is saved.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.currentRecord - Current form record
		 * @returns {boolean} Return true if record is valid
		 *
		 * @since 2015.2
		 */
		function saveRecord(scriptContext) {
	console.log('scriptContext',scriptContext);
			var currentRecord = scriptContext.currentRecord;

			if(reject.triggered){
				reject.triggered = 0;

				var reason = ''
				while(reason.trim() === ''){
					reason = prompt('Please enter the reason:');
					if(reason === null){
						return false;
					}else if(reason.trim()){
						currentRecord.setValue({
							fieldId: 'custpage_reason',
							value: reason
						});
						currentRecord.setValue({
							fieldId: 'custpage_action',
							value: 'reject'
						});
					}
				}
			}else{
				if(!confirm('Approve this invoice?')){
					return false;
				}
				currentRecord.setValue({
					fieldId: 'custpage_action',
					value: 'approve'
				});
			}

			return true;
		}

		function reject(){
			reject.triggered = 1;
			jQuery('#main_form').submit();
		}

		function printPDF(URL){
			window.open((URL || window.location.href + '&pdf=T'), '_blank');
		}

		return {
			pageInit: pageInit,
/*			fieldChanged: fieldChanged,
			postSourcing: postSourcing,
			sublistChanged: sublistChanged,
			lineInit: lineInit,
			validateField: validateField,
			validateLine: validateLine,
			validateInsert: validateInsert,
			validateDelete: validateDelete, */
			saveRecord: saveRecord,
			reject: reject,
			printPDF: printPDF
		};

	});
