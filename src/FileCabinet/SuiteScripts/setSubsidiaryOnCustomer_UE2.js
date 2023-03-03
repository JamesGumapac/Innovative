/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 define(['N/record', 'N/search', 'N/runtime'],
 function(record, search, runtime) {

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
         
         if(rec.type == 'customer' && (context.type == 'create' || context.type == 'edit')){
			log.debug('customer / create')
				var recObjLoaded = record.load({type: record.Type.CUSTOMER, id: recId, isDynamic: true})
				
				
				if(runtime.envType == 'PRODUCTION'){
					
					var subsidiariesArray = [8]
					log.debug('envType is:', runtime.envType)
				}
				else{
					
					var subsidiariesArray= [6]
					log.debug('envType is:', runtime.envType)
				}
				 
				 
				 	 
				for(var x = 0; x < subsidiariesArray.length; x++){ 

/**				 
					var csr = record.create({type: record.Type.CUSTOMER_SUBSIDIARY_RELATIONSHIP}) 
					csr.setValue({fieldId: 'entity', value: recId})
					csr.setValue({fieldId: 'subsidiary', value: subsidiariesArray[x]}) 
					var csrSavedId = csr.save({enableSourcing: false, ignoreMandatoryFields: true}); 
					log.debug('Saved Customer-Subsidiary Relationship record:', csrSavedId)	
**/				
					
					recObjLoaded.selectNewLine({sublistId: 'submachine'});
					recObjLoaded.setCurrentSublistValue({ sublistId: 'submachine', fieldId: 'subsidiary', value: subsidiariesArray[x] });
					recObjLoaded.commitLine({ sublistId: 'submachine' });
					
				} 
					
 
                         
                 custRecIdSaved = recObjLoaded.save({enableSourcing: false, ignoreMandatoryFields: true})
                 log.debug('Edited CUSTOMER:', recId)	
				 
				 
         }//end if CUSTOMER create
         


         
     }catch(e){

         log.error(e.name, e.message);
     }			

     }//end afterSubmit function
     




 

 

     return {
             afterSubmit: afterSubmit

     };
     
 });