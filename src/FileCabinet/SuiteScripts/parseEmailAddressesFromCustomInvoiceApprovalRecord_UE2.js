/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 *
 *
 */
define(['N/record', 'N/search'],
	function(record, search) {
   
		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} context
		 * @param {Record} context.newRecord - New record
		 * @param {string} context.type - Trigger type
		 * @param {Form} context.form - Current form
		 * @Since 2015.2
		 */
		function afterSubmit(context) {
			
			
		try{	
			
			var rec = context.newRecord
			var recId = rec.id
			log.debug('rec.type / recId / context.type is:', rec.type +' / '+ recId +' / '+ context.type)
			
			if(context.type != 'create' && context.type != 'edit') return

				var invoiceId = rec.getValue({fieldId: 'custrecord_invoice_number'})
				
				var email = rec.getValue({fieldId: 'custrecord_invapproval_email'})
				var ccEmail = rec.getValue({fieldId: 'custrecord_invapproval_email'})
				var approvalRole = rec.getValue({fieldId: 'custrecord_invapproval_role'})
				var approvalLevel = Number(rec.getValue({fieldId: 'custrecord_invapproval_level'}))
				var approvalTextData = rec.getValue({fieldId: 'custrecord_invapproval_data'})
				log.debug('approvalLevel / approvalRole:', approvalLevel +' / '+ approvalRole)
				var regex = /;/g;
				
				var fieldName = ''
				var ccFieldName = ''
				
				
				switch(approvalLevel) {
					
				  case 1:
						fieldName = 'custbody_dw_approver_1'
						ccFieldName = 'custbody_dw_approver_1_cc'
					break;
				  case 2:
						fieldName = 'custbody_dw_approver_2'
						ccFieldName = 'custbody_dw_approver_2_cc'
					break;
				  case 3:
						fieldName = 'custbody_dw_approver_3'
						ccFieldName = 'custbody_dw_approver_3_cc'
					break;
				  case 4:
						fieldName = 'custbody_dw_approver_4'
						ccFieldName = 'custbody_dw_approver_4_cc'
					break;
				  default: fieldName = ''
					
				}
				
				log.debug('fieldName is:', fieldName)
				
				if(!fieldName || fieldName == '') return
				
				
				//////////FIELD///////////
				//if the field we're writing to already has a value, then just concatenate this new value
				var invLookupObj = search.lookupFields({type: record.Type.INVOICE, id: invoiceId, columns: [fieldName, ccFieldName]})
				var currentFieldValue = invLookupObj[fieldName]
				var currentCcFieldValue = invLookupObj[ccFieldName]
				log.debug('currentFieldValue / currentCcFieldValue:', currentFieldValue +' / '+ currentCcFieldValue)
				
				
				
				if(fieldName && currentFieldValue){
				
					email = currentFieldValue + '; '+ email  //if there is already a value in the field, let's add a semicolon then our next email address
				
					log.debug('currentFieldValue is:', currentFieldValue)
				}
				//////////////
				if(ccFieldName && currentCcFieldValue){
				
					ccEmail = currentCcFieldValue + '; '+ ccEmail  //if there is already a value in the field, let's add a semicolon then our next email address
				
					log.debug('currentCcFieldValue is:', currentCcFieldValue)
				}
				
				
				
			if(approvalRole.toLowerCase() == 'approver'){
				
				record.submitFields({
					type: record.Type.INVOICE, 
					id: invoiceId, 
					values: {
						[fieldName]: email.replace(regex, ",")  
						}
				})
				log.debug('Wrote '+ email +' to Inv Id:', invoiceId)
				
			}
			else if(approvalRole.toLowerCase().indexOf('cc') > -1){
				
				
				record.submitFields({
					type: record.Type.INVOICE, 
					id: invoiceId, 
					values: {   
						[ccFieldName]: ccEmail.replace(regex, ",")  
						}
				})
				log.debug('Wrote '+ ccEmail +' to Inv Id:', invoiceId)
				
	
			}
				
/**
				record.submitFields({
					type: record.Type.INVOICE, 
					id: invoiceId, 
					values: {
						'custbody_dw_approver_1': 5,   //APPROVER 1
						'custbody_dw_approver_1_cc': 1,   //APPOVER 1 CC
						'custbody_dw_approver_2': 1,   //APPOVER 2
						'custbody_dw_approver_2_cc': 1,   //APPOVER 2 CC
						'custbody_dw_approver_3': 1,   //APPOVER 3
						'custbody_dw_approver_3_cc': 1,   //APPOVER 3 CC
						'custbody_dw_approver_4': 1,   //APPOVER 4
						'custbody_dw_approver_4_cc': 1   //APPOVER 4 CC
						}
				}) 
**/				

				
				log.debug('Finished afterSubmit on recId', recId)
			
			
		
			

		}catch(e){

			log.error(e.name, e.message);
		}			

		}//end afterSubmit function
		



		return {
				afterSubmit: afterSubmit

		};
		
	});