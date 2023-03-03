/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/format', 'N/record', 'N/search'],

	function(format, record, search) {
		
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
//			jQuery('#custpage_tab_paymentmethodlnk').hide();
			jQuery('#custpage_subtab_creditlnk').hide();
			jQuery('#custpage_tab_paymentmethodlnk').hide();

			jQuery('#custpage_page_fs_lbl_uir_label').parent().parent().attr('align', 'right');

			paginate(scriptContext.currentRecord, 0);
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
			var currentRecord = scriptContext.currentRecord;
			var sublistId = scriptContext.sublistId;
			var fieldId = scriptContext.fieldId;
			var lineNum = scriptContext.lineNum;
			if(!lineNum && sublistId)
				lineNum = currentRecord.getCurrentSublistIndex({ sublistId: sublistId });

			if(fieldId == 'custpage_page'){
				paginate(currentRecord, currentRecord.getValue({ fieldId: fieldId }));
			}else if(fieldId.match(/customer|currency|aracct|subsidiary|fromdate|todate/gi)){
				window.onbeforeunload = null;
				var url = new URL(location.href);
				var params = '?script=' + url.searchParams.get('script') +
					'&deploy=' + url.searchParams.get('deploy');

				(['subsidiary', 'customer', 'currency', 'trandate', 'aracct', 'fromdate', 'todate', 'location', 'department']).forEach(function(id){
					var value = currentRecord.getValue({ fieldId: 'custpage_' + id});
					if(!value)
						return;

					if(id.match(/date/gi))
						params += '&' + id + '=' + format.format({
							type: format.Type.DATE,
							value: value
						});
					else
						params += '&' + id + '=' + value;
				});

				window.open(url.pathname + params, '_self');
			}else if(fieldId == 'custpage_payment'){
				var paymentAmt = parseFloat(currentRecord.getValue({ fieldId: fieldId })) || 0;
				var appliedVal = parseFloat(jQuery('#applied_val').html().replace(/,/gi,'')) || 0;

				if(paymentAmt)
					fieldChanged.paymententered = 1;
				else
					fieldChanged.paymententered = 0;

				var autoApply = currentRecord.getValue({ fieldId: 'custpage_autoapply' });
				if(autoApply){
					autoApplyPayment(currentRecord);
				}else{
					if(!paymentAmt)
						paymentAmt = appliedVal;
				}

				var unappliedVal = (paymentAmt - appliedVal).toFixed(2);

				paymentAmt = paymentAmt.toFixed(2);

				if(!autoApply){
					jQuery('#total_val').html(addCommas(paymentAmt));
					jQuery('#unapplied_val').html(addCommas(unappliedVal));
				}

				currentRecord.setValue({
					fieldId: fieldId,
					value: paymentAmt,
					ignoreFieldChange: true
				});

			}else if(fieldId.match(/custcol_payment/gi)){
				
				var amount = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: fieldId,
					line: lineNum
				}) || 0) * 100;
				var amountRemaining = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_amountremaining',
					line: lineNum
				}) || 0) * 100;
				var discountTaken = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_discounttaken',
					line: lineNum
				}) || 0) * 100;

				if(amount >= amountRemaining){
					amount = amountRemaining;
					discountTaken = 0;
				}else if((amount + discountTaken) > amountRemaining){
					discountTaken = amountRemaining - amount;
				}

				if(fieldChanged.paymententered){
					var appliedValue = getTotalApplied( currentRecord );
					var totalAmount = currentRecord.getValue({ fieldId: 'custpage_payment' });
					var unapplied = (totalAmount + amount) - appliedValue;
					if(amount > unapplied)
						amount = unapplied;
				}

				if(amount < 0)
					amount = 0;

				currentRecord.setCurrentSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_apply',
					value: amount? true: false,
					ignoreFieldChange: true
				});
				currentRecord.setCurrentSublistValue({
					sublistId: sublistId,
					fieldId: fieldId,
					value: amount? (amount/100).toFixed(2): '',
					ignoreFieldChange: true
				});
				currentRecord.setCurrentSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_discounttaken',
					value: amount? (discountTaken/100).toFixed(2): '',
					ignoreFieldChange: true
				});
				currentRecord.commitLine({ sublistId: 'custpage_apply' });

				addRemoveSubs(currentRecord, lineNum, amount);

				summarizeAmount(currentRecord);
					
			}else if(fieldId.match(/custcol_apply/gi)){
				var isChecked = currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: fieldId,
					line: lineNum
				});
				if(isChecked){
					var amountRemaining = (parseFloat(currentRecord.getSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_amountremaining',
						line: lineNum
					})) || 0) * 100;
					var discountAmount = (parseFloat(currentRecord.getSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_termsdiscountamount',
						line: lineNum
					})) || 0) * 100;
					var discountDate = currentRecord.getSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_termsdiscountdate',
						line: lineNum
					});

					var isTermsExempt = currentRecord.getValue({ fieldId: 'custpage_istermsexempt' });

					if(discountDate && !isTermsExempt){
						discountDate = format.parse({
							type: format.Type.DATE,
							value: discountDate
						});
						discountDate.setDate( discountDate.getDate() + 1 );

						var currentDate = new Date();

						if( Date.parse( discountDate ) < Date.parse( currentDate ) )
							discountAmount = 0;
					}
					currentRecord.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_payment',
						value: ((amountRemaining - discountAmount)/100).toFixed(2)
					});
					currentRecord.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_discounttaken',
						value: (discountAmount/100).toFixed(2),
						ignoreFieldChange: true
					});
				}else{
					currentRecord.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_payment',
						value: ''
					});
					currentRecord.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_discounttaken',
						value: '',
						ignoreFieldChange: true
					});
				}

				currentRecord.commitLine({ sublistId: sublistId });

				addRemoveSubs(currentRecord, lineNum, isChecked);
					
			}else if(fieldId.match(/custpage_autoapply/gi)){

				if(currentRecord.getValue({ fieldId: fieldId }))
					autoApplyPayment(currentRecord);
			}else if(fieldId.match(/custcol_discounttaken/gi)){
				var amount = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_payment',
					line: lineNum
				}) || 0) * 100;
				var amountRemaining = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_amountremaining',
					line: lineNum
				}) || 0) * 100;
				var discountTaken = parseFloat(currentRecord.getSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_discounttaken',
					line: lineNum
				}) || 0) * 100;

				if(discountTaken < 0)
					discountTaken = 0;
				else if((amount + discountTaken) > amountRemaining)
					discountTaken = ( amountRemaining - amount );

				currentRecord.setCurrentSublistValue({
					sublistId: sublistId,
					fieldId: 'custcol_discounttaken',
					value: (discountTaken/100).toFixed(2),
					ignoreFieldChange: true
				});
			}else if( fieldId == 'custcol_file' && sublistId == 'custpage_sublist_file'){
				var value = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_file', line: lineNum});

				if(value == 'new'){
					var link = currentRecord.getValue({ fieldId: 'custpage_fileuploadlink' });
					nlExtOpenWindow(link,' ',700,700,'custpage_fileupload');
				}else if(value){
					var fileDetails = search.lookupFields({
						type: 'file',
						id: value,
						columns: ['documentsize', 'modified', 'filetype']
					});

					currentRecord.setCurrentSublistValue({
						sublistId: 'custpage_sublist_file',
						fieldId: 'custcol_size',
						value: fileDetails.documentsize
					});
					currentRecord.setCurrentSublistValue({
						sublistId: 'custpage_sublist_file',
						fieldId: 'custcol_modified',
						value: fileDetails.modified
					});

					if(fileDetails.filetype && fileDetails.filetype.length)
						currentRecord.setCurrentSublistValue({
							sublistId: 'custpage_sublist_file',
							fieldId: 'custcol_filetype',
							value: fileDetails.filetype[0].text
						});
				}
			}else if( fieldId == 'custpage_fileuploaded' ){
				var value = currentRecord.getValue({ fieldId: 'custpage_fileuploaded' });

				if(value){
					value = JSON.parse( value );
					var field = nlapiGetLineItemField('custpage_sublist_file', 'custcol_file');
					addSelectOption(document, field.uifield, value.text, value.value, true);
				}
			}
		}

		function autoApplyPayment(currentRecord){
			var paymentAmount = currentRecord.getValue({ fieldId: 'custpage_payment' }) || 0;
			var amount = paymentAmount

			var page = parseInt(currentRecord.getValue({ fieldId: 'custpage_page' }));
			var visibleFrom = page * 200;
			var visibleTo = visibleFrom + 200;
			var lineCount = currentRecord.getLineCount({ sublistId: 'custpage_apply' });
			for(var line = 0; line < lineCount; line++){
				var lineAmount = currentRecord.getSublistValue({
					sublistId: 'custpage_apply',
					fieldId: 'custcol_amountremaining',
					line: line
				});

				if(line >= visibleFrom && line < visibleTo){
					lineAmount = lineAmount > amount? amount: lineAmount;
					amount -= lineAmount;
				}else
					lineAmount = 0;

				currentRecord.selectLine({
					sublistId: 'custpage_apply',
					line: line
				});
				currentRecord.setCurrentSublistValue({
					sublistId: 'custpage_apply',
					fieldId: 'custcol_apply',
					value: lineAmount? true: false,
					ignoreFieldChange: true
				});
				currentRecord.setCurrentSublistValue({
					sublistId: 'custpage_apply',
					fieldId: 'custcol_payment',
					value: lineAmount? lineAmount.toFixed(2): '',
					ignoreFieldChange: true
				});
				currentRecord.commitLine({ sublistId: 'custpage_apply' });
			}

			jQuery('#total_val').html(addCommas(paymentAmount.toFixed(2)));
			jQuery('#applied_val').html(addCommas((paymentAmount - amount).toFixed(2)));
			jQuery('#unapplied_val').html(addCommas(amount.toFixed(2)));

		}

		function summarizeAmount(currentRecord){
			var totalVal = 0;
			var unappliedVal = 0;
			var appliedVal = getTotalApplied(currentRecord);

			if(fieldChanged.paymententered)
				totalVal = currentRecord.getValue({ fieldId: 'custpage_payment' }) || 0;

			totalVal = totalVal || appliedVal;
			unappliedVal = totalVal - appliedVal;

			jQuery('#total_val').html(addCommas(totalVal.toFixed(2)));
			jQuery('#applied_val').html(addCommas(appliedVal.toFixed(2)));
			jQuery('#unapplied_val').html(addCommas(unappliedVal.toFixed(2)));

			if(!fieldChanged.paymententered)
				currentRecord.setValue({
					fieldId: 'custpage_payment',
					value: totalVal.toFixed(2),
					ignoreFieldChange: true
				});
		}

		function getTotalApplied(currentRecord){
			var appliedVal = 0;
			var lineCount = currentRecord.getLineCount({ sublistId: 'custpage_apply' });
			for(var line = 0; line < lineCount; line++){
				var lineAmount = currentRecord.getSublistValue({
					sublistId: 'custpage_apply',
					fieldId: 'custcol_payment',
					line: line
				}) || 0;


				appliedVal += lineAmount;
			}
			return appliedVal;
		}

		function hasChecked(){
			return jQuery('#custpage_apply_form').find('.checkbox_ck').length;
		}

		function addCommas(x){
			var parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
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
			var currentRecord = scriptContext.currentRecord;
			var fieldId = scriptContext.fieldId;
			if(hasChecked() && fieldId.match(/customer|currency|aracct|subsidiary/gi)){
				if(confirm('Data you entered on this page has not been saved and will be lost.\nPress OK to proceed.'))
					return true;
				else
					return false;

			}else if( fieldId.match(/custpage_payment/gi) ){
				if(currentRecord.getValue({ fieldId: fieldId }) < 0){
					alert('Invalid currency value. Value can not be negative');
					return false;
				}
			}else if( fieldId.match(/custpage_account/gi) ){
				var value = currentRecord.getValue({ fieldId: fieldId });
				var currency = currentRecord.getValue({ fieldId: 'custpage_currency' });

				if(!currency)
					return true;

				if(value){
					var acctRecord = record.load({
						type: 'account',
						id: value
					});
					var acctCurrency = acctRecord.getValue({ fieldId: 'currency' });

					if(acctCurrency && acctCurrency != currency){
						alert('This account has a different currency.');
						return false;
					}
				}
			}
			
			return true;
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
			var unappliedVal = parseFloat(jQuery('#unapplied_val').html().replace(/,/gi,'')) || 0;
			if(unappliedVal < 0){
				alert('You cannot apply more than your total payments.');
				return false;
			}

			if(!jQuery('#custpage_apply_splits').find('.checkbox_ck').length){
				alert('Please select at least one invoice');
				return false;
			}

			var currentRecord = scriptContext.currentRecord;
			var subsidiary = (currentRecord.getValue({ fieldId: 'custpage_subsidiary' }) || '').toString().split(',');
			if(subsidiary.length > 1){
				var selectedSubs = JSON.parse(currentRecord.getValue({ fieldId: 'custpage_selectedsubs' }) || '{}');

				var emptyAccount = [];
				for(var subs in selectedSubs){
					if(selectedSubs[subs].invoice.length){
						var bankAcct = currentRecord.getValue({
							fieldId: 'custpage_account' + subs
						});

						if(!bankAcct)
							emptyAccount.push('Bank Account for ' + selectedSubs[subs].name);
					}
				}

				if(emptyAccount.length){
					alert('Please enter value(s) for: ' + emptyAccount.join(', '));
					return false;
				}
			}

			return true;
		}

		function payAll(){
			fieldChanged.paymententered = 0;

			jQuery('#custpage_apply_form').find('.checkbox_ck').click();
			jQuery('#custpage_apply_form').find('.checkbox_unck').click();
		}

		function autoApply(){
			jQuery('#custpage_autoapply_fs').click()
			jQuery('#custpage_autoapply_fs').click()
		}

		function clear(){
			jQuery('#custpage_apply_form').find('.checkbox_ck').click();
		}

		function paginate(currentRecord, page){
			page = parseInt(page);
			var from = page * 200;
			var to = from + 200;
			var lines = currentRecord.getLineCount({ sublistId: 'custpage_apply' });
			for(var x=0;x<lines;x++){
				if(x >= from && x < to)
					jQuery('#custpage_applyrow' + x).show();
				else
					jQuery('#custpage_applyrow' + x).hide();
			}
		}

		function addRemoveSubs(currentRecord, line, add){
			var invoice = currentRecord.getSublistValue({
				sublistId: 'custpage_apply',
				fieldId: 'custcol_internalid',
				line: line
			});
			var subsId = currentRecord.getSublistValue({
				sublistId: 'custpage_apply',
				fieldId: 'custcol_subsidiary',
				line: line
			});
			var subsName = currentRecord.getSublistValue({
				sublistId: 'custpage_apply',
				fieldId: 'custcol_subsidiarynohierarchy',
				line: line
			});

			var selectedSubs = JSON.parse(currentRecord.getValue({ fieldId: 'custpage_selectedsubs' }) || '{}');

			if(!selectedSubs[subsId])
				selectedSubs[subsId] = {
					id: subsId,
					name: subsName,
					invoice: []
				};
			
			var index = selectedSubs[subsId].invoice.indexOf( invoice );
			if(add && index < 0)
				selectedSubs[subsId].invoice.push( invoice );
			else if(!add){
				if(index >= 0)
					selectedSubs[subsId].invoice.splice( index, 1 );
			}

			try{
				nlapiSetFieldMandatory('custpage_account' + subsId, selectedSubs[subsId].invoice.length);
			}catch(e){}
			
			currentRecord.setValue({
				fieldId: 'custpage_selectedsubs',
				value: JSON.stringify(selectedSubs)
			});
		}
		
		return {
			pageInit: pageInit,
			fieldChanged: fieldChanged,
			validateField: validateField,
/*			postSourcing: postSourcing,
			sublistChanged: sublistChanged,
			lineInit: lineInit,
			validateLine: validateLine,
			validateInsert: validateInsert,
			validateDelete: validateDelete,
*/			saveRecord: saveRecord,
			payAll: payAll,
			autoApply: autoApply,
			clear: clear
		};
		
	}
);
