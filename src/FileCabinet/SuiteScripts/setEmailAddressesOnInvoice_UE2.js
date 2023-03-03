/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
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
		function beforeLoad(scriptContext) {
			
			
		try{	
			
			if(scriptContext.type !== scriptContext.UserEventType.COPY && scriptContext.type !== scriptContext.UserEventType.CREATE) return;
			
			var rec = scriptContext.newRecord;
			var recId = rec.id;
			var recType = rec.type;					
			log.debug('Firing beforeLoad on '+ recType +' with ID:', recId);
			
            var custCCEmailOne = rec.getValue({fieldId: 'custbody_invoice_email'});
            var custCCEmailTwo = rec.getValue({fieldId: 'custbody_invoice_cc'});
            var custCCEmailThree = rec.getValue({fieldId: 'custbody_invoice_bcc'});
                        
			var emailArray = []

			if(custCCEmailOne && custCCEmailOne.length > 0){ 
				emailArray.push(custCCEmailOne) 
				
			}
			
			
			if(custCCEmailTwo && custCCEmailTwo.length > 0){ 
			emailArray.push(custCCEmailTwo) 
			
			}
			
			
			if(emailArray.length > 1){
				emailArray.join(',');
				log.debug('emailArray length greater than 1 is now:', emailArray.toString());
				
				
				rec.setValue({fieldId: 'email', value: emailArray.toString()})
			}	
			else if(emailArray.length == 1){
				emailArray = emailArray[0].trim()
				log.debug('emailArray length of 1 is now:', emailArray.toString());
				rec.setValue({fieldId: 'email', value: emailArray})
				
				
			}

			
		}catch(e){

			log.error(e.name, e.message);
		}			

		}
		

		return {
				beforeLoad: beforeLoad

		};
		
	});