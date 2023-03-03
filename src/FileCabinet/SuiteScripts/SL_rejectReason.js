/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/https', 'N/ui/serverWidget','N/redirect','N/url'],
/**
 * @param {record} record
 */
function(record,https,serverWidget,redirect,url) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if (context.request.method === 'GET') {

			if(context.request.parameters['cancel'] == "true"){
				var nsRecord = record.load({
					type: context.request.parameters['recordType'],
					id : context.request.parameters['recordId'], 
			   });

			   nsRecord.setValue({
				fieldId: context.request.parameters.rejectField,
				value: "",
			   });

			   var recordId = nsRecord.save({
				ignoreMandatoryFields: true
			   });
   
			   redirect.toRecord({
				type : context.request.parameters['recordType'], 
				id : context.request.parameters['recordId'],
			   });
			}
	    	var form = serverWidget.createForm({
	            title: 'Reject Record',
	        });
          var output = url.resolveRecord({
 recordType: context.request.parameters['recordType'],
 recordId: context.request.parameters['recordId'],
 isEditMode: false
});

log.error({title:output,details:""})
var recordType = context.request.parameters['recordType'];
var recordId = context.request.parameters['recordId'];
var rejectField = context.request.parameters.rejectField;

var sl_url = url.resolveScript({
    scriptId: 'customscript_sl_reject_reason',
    deploymentId: 'customdeploy_sl_reject_reason',
    params: {
        "cancel": true,
        "recordType" : recordType,
        "recordId" : recordId,
        "rejectField": rejectField
    },
});
            var button = form.addButton({
             id : 'custpage_cancelReject',
             label : 'Cancel',
             functionName: "window.open('"+sl_url+"','_self')",
            });

	    	var reason = form.addField({
	            id: 'custpage_sl_reject_reason',
	            type: serverWidget.FieldType.TEXTAREA,
	            label: 'Reject Reason'
	        });
	    	reason.isMandatory = true;
	    	
	    	var recordType = form.addField({
	            id: 'custpage_sl_record_type',
	            type: serverWidget.FieldType.TEXT,
	            label: 'Record Type'
	        });
	    	recordType.updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.HIDDEN
    		});
	    	recordType.defaultValue = context.request.parameters.recordType;
          
          var orderStatus = form.addField({
	            id: 'custpage_sl_isorder_status',
	            type: serverWidget.FieldType.TEXT,
	            label: 'Order Status'
	        });
	    	orderStatus.updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.HIDDEN
    		});
	    	orderStatus.defaultValue = context.request.parameters.orderStatus;
	    	
	    	var recordId = form.addField({
	            id: 'custpage_sl_recordid',
	            type: serverWidget.FieldType.TEXT,
	            label: 'Record ID',
	            
	        });
	    	
	    	recordId.updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.HIDDEN
    		});
	    	recordId.defaultValue = context.request.parameters.recordId;
	    	
            var rejectField = form.addField({
	            id: 'custpage_sl_reject_field',
	            type: serverWidget.FieldType.TEXT,
	            label: 'Record Type'
	        });
          
            rejectField.updateDisplayType({
    		 displayType: serverWidget.FieldDisplayType.HIDDEN
    		});
	    	rejectField.defaultValue = context.request.parameters.rejectField;
          
	    	form.addSubmitButton({
	            label: 'Submit'
	        });
	    	context.response.writePage(form);
    	}else{
    		var recordType = context.request.parameters.custpage_sl_record_type;
    		var recordId = context.request.parameters.custpage_sl_recordid;
    		var rejectReason = context.request.parameters.custpage_sl_reject_reason;
            var rejectField = context.request.parameters.custpage_sl_reject_field;
            var orderStatus = context.request.parameters.custpage_sl_isorder_status;
    		var nsRecord = record.load({
    			 type: recordType,
    			 id : recordId, 
			});
          log.error({title:"reject field", details:rejectField})
            if(rejectField){
              nsRecord.setValue({
               fieldId: rejectField,
               value: rejectReason,
              });
            }
          // removed since field id will be sourced from script parameter in Workflow Action Script
          /*else{
              if(recordType == "customer" || recordType == "job"){
              customerRecord.setValue({
               fieldId: 'custentitydw_rejection_reason',
               value: rejectReason,
              });

              customerRecord.setValue({
               fieldId: 'custentity_dw_approval_status',
               value: 3,
              });
              }else if(recordType == "purchaseorder"){
                customerRecord.setValue({
               fieldId: 'custbody_apsl_rejection_reason',
               value: rejectReason,
              });
              }else if(recordType == "expensereport"){
                customerRecord.setValue({
               fieldId: 'custbody_apsl_rejection_reason',
               value: rejectReason,
              });
			  }else if(recordType == "invoice"){
                customerRecord.setValue({
               fieldId: 'custbody_apsl_rejection_reason',
               value: rejectReason,
              });
              }
            }*/
    		var recordId = nsRecord.save({
			 ignoreMandatoryFields: true
			});

    		redirect.toRecord({
			 type : recordType, 
			 id : recordId,
			});

    	}
    }

    return {
        onRequest: onRequest
    };
    
});
