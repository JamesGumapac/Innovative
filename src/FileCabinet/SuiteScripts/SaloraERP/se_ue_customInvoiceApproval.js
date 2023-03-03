/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url'],

	(record, runtime, search, url) => {

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

			if (type.match(/view/gi)) {
				log.debug('viewmode', 'viewmode');
				/*				var link = newRecord.getValue({ fieldId: 'custbody_salora_approvallink' });
								link = `<a href="${link}">${link}</a>`;
				
								newRecord.setValue({ fieldId: 'custbody_salora_approvallink', value: link});
				
								form.getField({ id: 'custbody_salora_approvallink' }).defaultValue = link;
				*/
				//				form.clientScriptModulePath = 'SuiteScripts/JM/se_cs_addConfirmationAlertApprovalBtn.js'
				var field = form.addField({
					id: 'custpage_custscript',
					label: ' ',
					type: 'inlinehtml'
				});
				field.defaultValue = `<script>
					(['custpageworkflow578', 'custpageworkflow588', 'custpageworkflow580']).forEach(function(id){
						if(jQuery('#' + id).length){
							var msg = '';
							if(id == 'custpageworkflow578')
								msg = 'This action will send the invoice to the first approver, where available. If no approver is configured, the final invoice will be sent to the end customer.';
							else if(id == 'custpageworkflow588')
								msg = 'This action will terminate the approval workflow, and send the final invoice to the end customer. Use this option if the customer has approved this invoice via external communication.';
							else if(id == 'custpageworkflow580')
								msg = 'This action will terminate the approval workflow, as if the customer rejected it from the portal. Use this option if the customer has rejected the invoice via external communication.';
							
							if(msg)
								jQuery('#' + id).attr('onclick', 'if(confirm("' + msg + '")){' + jQuery('#' + id).attr('onclick') + '}');
						}
					});
				</script>`;
			}

			if (!type.match(/view/gi)) {
				return;
			}

			var approvalStatus = newRecord.getValue({
				fieldId: 'custbody_inv_approval_status'
			});
			var linkValidity = parseInt(newRecord.getValue({
				fieldId: 'custbody_salora_approvallinkvalidity'
			}));
			var linkOpenedTimeStamp = parseInt(newRecord.getValue({
				fieldId: 'custbody_salora_approvallinktimestamp'
			}) || 0);
			linkOpenedTimeStamp = linkOpenedTimeStamp ? linkOpenedTimeStamp + 300000 : 0;
			log.debug('linkValidity beforeload', linkValidity);

			if (!linkValidity)
				return;

			var currentDate = Date.parse(new Date());

			if (!approvalStatus.match(/[23]/gi) && (linkValidity < currentDate ||
				(linkOpenedTimeStamp && linkOpenedTimeStamp < currentDate))) {
				form.addButton({
					id: 'custpage_generateapprovallink',
					label: 'Regenerate Approval Link',
					functionName: `jQuery('#custpage_generateapprovallink').attr('disabled','disabled');` +
						`require(['N/record'], function(record){` +
						//							`record.submitFields({type: 'invoice', id: '${newRecord.id}', ` +
						//							`values: { custbody_salora_approvallinkvalidity: null }});` +
						`record.submitFields({type: 'invoice', id: '${newRecord.id}', ` +
						`values: { custbody_salora_approvallinkvalidity: null }});` +
						`});setTimeout(function(){` +
						`window.location.reload();},1000);`
				});
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
			var { type, newRecord } = scriptContext;

			if (!type.match(/edit/gi))
				return;


			var lookup = search.lookupFields({
				type: newRecord.type,
				id: newRecord.id,
				columns: ['custbody_salora_approvallinkvalidity', 'custbody_routing_ready']
			});

			var routingReady = newRecord.getValue({ fieldId: 'custbody_routing_ready' }) || lookup.custbody_routing_ready;
			var linkValidity = newRecord.getValue({ fieldId: 'custbody_salora_approvallinkvalidity' }) ||
				lookup.custbody_salora_approvallinkvalidity;
			log.debug('beforeSubmit', routingReady + ' - ' + linkValidity);

			if (linkValidity || !routingReady)
				return;

			var script = runtime.getCurrentScript();
			var scriptId = script.getParameter('custscript_salora_aprovalslscript');
			var deploymentId = script.getParameter('custscript_salora_aprovalsldeployment');
			var validityInDays = script.getParameter('custscript_salora_linkvalidity') || 1;

			var currentDate = Date.parse(new Date());

			var key = Math.random().toString(36).substring(2) +
				currentDate.toString(36);

			currentDate += (86400000 * parseFloat(validityInDays));

			var slURL = url.resolveScript({
				scriptId, deploymentId,
				returnExternalUrl: true,
				params: {
					tid: key
				}
			});

			newRecord.setValue({
				fieldId: 'custbody_salora_invoiceapprovaltoken',
				value: key
			});
			newRecord.setValue({
				fieldId: 'custbody_salora_approvallinkvalidity',
				value: currentDate.toString()
			});
			newRecord.setValue({
				fieldId: 'custbody_salora_approvallinktimestamp',
				value: ''
			});
			newRecord.setValue({
				fieldId: 'custbody_invoice_date_time',
				value: new Date()
			});

			newRecord.setValue({
				fieldId: 'custbody_salora_approvallink',
				value: slURL
			});

			/*
						record.submitFields({
							type: newRecord.type,
							id: newRecord.id,
							values: {
								custbody_salora_invoiceapprovaltoken: key,
								custbody_salora_approvallinkvalidity: currentDate.toString(),
								custbody_salora_approvallinktimestamp: '',
								custbody_invoice_date_time: new Date(),
								custbody_salora_approvallink: slURL
							}
						});
			*/
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
			var { type, newRecord } = scriptContext;

			if (type == 'create' || type == 'edit') {

				var stInvoiceCC = newRecord.getValue({
					fieldId: 'custbody_invoice_cc'
				});
				var stInvoiceBCC = newRecord.getValue({
					fieldId: 'custbody_invoice_bcc'
				});
				var stInvoiceRecipient = newRecord.getValue({
					fieldId: 'custbody_invoice_email'
				});

				if (stInvoiceCC) {
					var arrInvoiceCC = stInvoiceCC.split(", ");
					var validInvoiceCC = validateEmailArray(arrInvoiceCC);
				}
				if (stInvoiceBCC) {
					var arrInvoiceBCC = stInvoiceBCC.split(", ");
					var validInvoiceBCC = validateEmailArray(arrInvoiceBCC);
				}
				if (stInvoiceRecipient) {
					var arrInvoiceRecipient = stInvoiceRecipient.split(", ");
					var validInvoiceRecipient = validateEmailArray(arrInvoiceRecipient);
				}

				if (type == 'create') {
					record.submitFields({
						type: newRecord.type,
						id: newRecord.id,
						values: {
							custbody_salora_invoiceapprovaltoken: '',
							custbody_salora_approvallinkvalidity: '',
							custbody_salora_approvallinktimestamp: '',
							custbody_invoice_date_time: null,
							custbody_salora_approvallink: '',
							custbody_routing_ready: false,
							custbody_invoice_cc: validInvoiceCC,
							custbody_invoice_bcc: validInvoiceBCC,
							custbody_invoice_email: validInvoiceRecipient
						}
					});
				}

				else if (type == 'edit') {
					record.submitFields({
						type: newRecord.type,
						id: newRecord.id,
						values: {
							custbody_invoice_cc: validInvoiceCC,
							custbody_invoice_bcc: validInvoiceBCC,
							custbody_invoice_email: validInvoiceRecipient
						}
					});
				}
			}

		}

		const validateEmailArray = (arrEmailAddress) => {
			var emailRegex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
			var emails = arrEmailAddress;
			var validEmails = [];
			for (var i = 0; i < emails.length; i++) {
				if (emailRegex.test(emails[i])) {
					validEmails.push(emails[i]);
				}
			}

			var strEmail = validEmails.join(', ');

			log.debug({
				title: 'validEmails',
				details: validEmails
			})
			log.debug({
				title: 'strEmail',
				details: strEmail
			})
			return strEmail
		}

		return {
			beforeLoad,
			beforeSubmit,
			afterSubmit
		};

	});
