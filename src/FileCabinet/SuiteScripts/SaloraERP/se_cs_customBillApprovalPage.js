/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
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

			if(action)
				message.create({
					title: 'Confirmation',
					message: 'Bill record successfully ' + (action == 'approved'? 'Approved.': 'Rejected.'),
					type: message.Type.CONFIRMATION
				}).show();

			setTimeout(function(){
				window.history.pushState(null, "", window.location.href);        
				window.onpopstate = function() {
					window.history.pushState(null, "", window.location.href);
				};
			},2000);
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
			var currentRecord = scriptContext.currentRecord;

			if(!reject.triggered){
				if(!confirm('Approve this bill/line item?'))
					return false;

				currentRecord.setValue({
					fieldId: 'custpage_action',
					value: 'approved'
				});
			}else{

				reject.triggered = 0;
				if(confirm('Reject this bill/line item?')){

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
								value: 'rejected'
							});
						}
					}
				}else
					return false;
			}

			return true;
		}

		function reject(){
			reject.triggered = 1;
			jQuery('#submitter').click();
		}

		function backToList(listUrl){
			window.open(listUrl, '_self');
		}

		function printPdf(link){
			window.open(link, '_blank', 'width=1000,height=700');
		}
		return {
			pageInit: pageInit,
//			fieldChanged: fieldChanged,
//			postSourcing: postSourcing,
//			sublistChanged: sublistChanged,
//			lineInit: lineInit,
//			validateField: validateField,
//			validateLine: validateLine,
//			validateInsert: validateInsert,
//			validateDelete: validateDelete,
			saveRecord: saveRecord,
			reject: reject,
			backToList: backToList,
			printPdf: printPdf
		};
		
	});
