/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * 
 */
define(['N/record', 'N/search', 'N/currentRecord', 'N/format'],

function(record, search, currentRecord, format) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function fieldChanged(context){
    

	try{
					
		var rec = context.currentRecord;
		var recId = rec.id;	
		
		
		if(context.fieldId == 'custbody_invoice_cc' || context.fieldId == 'custbody_invoice_bcc' || context.fieldId == 'custbody_invoice_email'){
			
			log.debug('Firing fieldChanged on Invoice with recId:', recId);	
		
					var custId =  rec.getValue({fieldId: 'entity'});	
					var custLookupObj = search.lookupFields({type: record.Type.CUSTOMER, id: custId, columns: ['email']})
					var custEmail = custLookupObj.email

					var emailArray = []
					//if(custEmail && custEmail.length > 0) emailArray.push(custEmail)

					var clientCCemailAddress =  rec.getValue({fieldId: 'custbody_invoice_cc'});
					if(clientCCemailAddress.length > 0)	emailArray.push(clientCCemailAddress)
						
					var clientCCemailAddressTwo =  rec.getValue({fieldId: 'custbody_invoice_bcc'});
					if(clientCCemailAddressTwo.length > 0)	emailArray.push(clientCCemailAddressTwo)
          
          			var clientCCemailAddressThree =  rec.getValue({fieldId: 'custbody_invoice_email'});
					if(clientCCemailAddressThree.length > 0)	emailArray.push(clientCCemailAddressThree)
					
					if(emailArray.length > 1){
						emailArray.join(';');
						log.debug('emailArray length greater than 1 is now:', emailArray.toString());
						
						
						rec.setValue({fieldId: 'email', value: emailArray.toString()})
					}	
					else if(emailArray.length == 1){
						emailArray = emailArray[0].trim()
						log.debug('emailArray length of 1 is now:', emailArray.toString());
						rec.setValue({fieldId: 'email', value: emailArray})
						
						
					}
				
		}//end if custbody_clientccemailadd changes
									
									
	}catch(e){
	log.error(e.name, e.message);
	}		

    }
	
	
	function pageInit(context){
				
		try{
		
			var rec = context.currentRecord;
			var recId = rec.id;	
			
			var emailArray = []
			//if(custEmail && custEmail.length > 0) emailArray.push(custEmail)

			var clientCCemailAddress =  rec.getValue({fieldId: 'custbody_invoice_cc'});
			
			if(clientCCemailAddress.length > 0)	emailArray.push(clientCCemailAddress)
						
			var clientCCemailAddressTwo =  rec.getValue({fieldId: 'custbody_invoice_bcc'});
			
			if(clientCCemailAddressTwo.length > 0)	emailArray.push(clientCCemailAddressTwo)
          
          	var clientCCemailAddressThree =  rec.getValue({fieldId: 'custbody_invoice_email'});
			
			if(clientCCemailAddressThree.length > 0)	emailArray.push(clientCCemailAddressThree)
					
			if(emailArray.length > 1){
				emailArray.join(';');
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
        fieldChanged: fieldChanged,
        pageInit: pageInit
		
  
    };
    
});