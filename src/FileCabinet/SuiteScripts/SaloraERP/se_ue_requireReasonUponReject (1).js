/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/runtime'],

	(runtime) => {
	   
		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */
		const beforeLoad = scriptContext => {
			var { type, newRecord, form } = scriptContext;

			if(type == 'view'){

				var invStatus = newRecord.getValue({ fieldId: 'custbody_invoice_approval_status' });

				var script = runtime.getCurrentScript();
				var rejectReasonFieldId = script.getParameter('custscript_reqreasonreject_rejreafldid');
				var approveButtonId = (script.getParameter(`custscript_reqreasonreject_approvebtnids`) || '').split(',');
				var rejectButtonId = (script.getParameter(`custscript_reqreasonreject_rejectbtnids`) || '').split(',');

				buttonFunctions = ``;
				approveButtonId.forEach(id=>{
					if(!id)
						return;

					buttonFunctions += `
						if(jQuery('#${id}').length){
							jQuery('#${id}').attr('onclick',
								'if(confirm("Are you sure you want to approve it?")){ ' + jQuery('#${id}').attr('onclick') + '}');
						}
					`;
				});
				rejectButtonId.forEach(id=>{
					if(!id)
						return;

					buttonFunctions += `
						if(jQuery('#${id}').length){
							jQuery('#${id}').attr('onclick',
								'if(requireRejectReason()){ ' + jQuery('#${id}').attr('onclick') + '}');
						}
					`;

				});

				form.addField({
					id: `custpage_custscript`,
					label: ' ',
					type: 'inlinehtml'
				}).defaultValue = `
					<script>
						function requireRejectReason(){
							var reason = '';
							while(reason.trim() === ''){
								reason = prompt('Please enter the reason.');

								if(reason === null)
									return false;
								else if(reason.trim()){
									jQuery('#ext-element-61').show();
									nlapiSubmitField('${newRecord.type}', '${newRecord.id}',
										'${rejectReasonFieldId}', reason);
									return true;
								}
							}
						}
						${buttonFunctions}
					</script>
				`;

			}
		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const beforeSubmit = scriptContext => {

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const afterSubmit = scriptContext => {

		}

		return {
			beforeLoad,
//			beforeSubmit,
//			afterSubmit
		};
		
	});
