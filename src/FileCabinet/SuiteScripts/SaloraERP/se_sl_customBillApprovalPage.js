/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/config', 'N/format', 'N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/runtime', 'N/url'],

	(config, format, ui, search, record, redirect, runtime, url) => {
	   
		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		const onRequest = context => {

			if(context.request.method == 'GET')
				getRequest(context);
			else
				postRequest(context);
		}

		const getRequest = context => {
			var {request, response} = context;
			var params = request.parameters;

			if(params.je){
				var journalDocNum = search.lookupFields({
					type: search.Type.JOURNAL_ENTRY,
					id: params.je,
					columns: ['tranid']
				}).tranid;
				var journalURL = url.resolveRecord({
					recordType: record.Type.JOURNAL_ENTRY,
					recordId: params.je
				});

				var form = ui.createForm({ title: `Payment successfully generated <a href="${journalURL}" style="color: #255599">Journal #${journalDocNum}</a>.` });
				form.addButton({
					id: 'custpage_btnnewpayment',
					label: 'New Payment',
					functionName: `window.open(location.href.replace(/(&je.*)/gi,''));`
				});
				response.writePage(form);

				return;
			}
			
			// Add custom fields
			var { form, fields, sublist, sublistFields } = buildForm( params );

			if(params.customer)
				setSublistValue(fields, sublist, params);

			context.response.writePage(form);
		}

		const buildForm = params => {
log.debug('params', params);
			var script = runtime.getCurrentScript();

			var isMultiSubs = script.getParameter('custscript_custconspayment_multisubs');

			// Split subsidiary params
			params.subsidiary = params.subsidiary? params.subsidiary.split(','): '';

			var form = ui.createForm({
				title: 'Consolidated Payment'
			});

			// Add Tab
			form.addTab({
				id: 'custpage_tab_apply',
				label: 'Apply'
			});
			form.addTab({
				id: 'custpage_tab_communication',
				label: 'Communication'
			});
			form.addTab({
				id: 'custpage_tab_paymentmethod',
				label: ' '
			});

			form.addSubtab({
				id: 'custpage_subtab_invoice',
				label: 'Invoices',
				tab: 'custpage_tab_apply'
			});
			form.addSubtab({
				id: 'custpage_subtab_credit',
				label: ' ',
				tab: 'custpage_tab_apply'
			});
			form.addSubtab({
				id: 'custpage_subtab_file',
				label: 'Files',
				tab: 'custpage_tab_communication'
			});
			
			// Add field group
			form.addFieldGroup({
				id: 'custpage_fldgrp_main',
				label: 'Primary Information'
			});

			var subsFieldType = ui.FieldType[isMultiSubs? 'MULTISELECT': 'SELECT'];

			var fields = {};
			var fieldsToCreate = [
				//['id', 'label', 'type', 'source', 'container'],
				['customer', 'Customer', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['subsidiary', 'Subsidiary', subsFieldType, null, 'custpage_fldgrp_main'],
				['cb_consolidatedjedocnum', 'Payment #', ui.FieldType.TEXT, null, 'custpage_fldgrp_main'],
				['aracct', 'A/R Account', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['account', 'Bank Account', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['currency', 'Currency', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['trandate', 'Date', ui.FieldType.DATE, null, 'custpage_fldgrp_main'],
				['department', 'Department', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['location', 'Location', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['memo', 'Memo', ui.FieldType.TEXT, null, 'custpage_fldgrp_main'],
				['payment', 'Payment Amount', ui.FieldType.FLOAT, null, 'custpage_tab_apply', 'custpage_fldgrp_main'],
				['autoapply', 'Auto Apply', ui.FieldType.CHECKBOX, null, 'custpage_tab_apply', 'custpage_fldgrp_main'],
				['paymentmethod', 'Payment Method', ui.FieldType.SELECT, null, 'custpage_fldgrp_main'],
				['primarysubs', 'Primary Subsidiary', ui.FieldType.TEXT, null, 'custpage_fldgrp_main'],
				['selectedsubs', 'Primary Subsidiary', ui.FieldType.LONGTEXT, null, 'custpage_fldgrp_main'],
				['fileuploadlink', 'File Upload Link', ui.FieldType.LONGTEXT, null, 'custpage_fldgrp_main'],
				['fileuploaded', 'File Uploaded', ui.FieldType.LONGTEXT, null, 'custpage_tab_paymentmethod'],
				['istermsexempt', 'Is Payment Terms Exempted', ui.FieldType.CHECKBOX, null, 'custpage_tab_paymentmethod'],
//				['tranid', 'Check #', ui.FieldType.TEXT, null, 'custpage_fldgrp_main'],
			];
			if(params.subsidiary.length > 1){

				var subsName = {};
				search.create({
					type: 'subsidiary',
					filters: [['internalid', 'anyof', params.subsidiary]],
					columns: [{ name: 'namenohierarchy' }]
				}).run().getRange(0,1000).forEach(res=>{
					subsName[res.id] = res.getValue(res.columns[0]);
				});

				params.subsidiary.forEach(subsId=>{
					fieldsToCreate.push([`account${subsId}`, `Bank Account for ${subsName[subsId]}`,
						ui.FieldType.SELECT, null, 'custpage_fldgrp_main']);
				});
			}

			fieldsToCreate.push(
				['fromdate', 'Date From', ui.FieldType.DATE, null, 'custpage_subtab_invoice'],
				['todate', 'Date To', ui.FieldType.DATE, null, 'custpage_subtab_invoice'],
				['page', 'Page', ui.FieldType.SELECT, null, 'custpage_subtab_invoice'],
				['dummy', ' ', ui.FieldType.TEXT, null, 'custpage_subtab_credit'],
				['dummy2', ' ', ui.FieldType.TEXT, null, 'custpage_tab_paymentmethod'],
				['summary', ' ', ui.FieldType.RICHTEXT, null, 'custpage_fldgrp_main']
			);
			fieldsToCreate.forEach(fld=>{
				fields[fld[0]] = form.addField({
					id: `custpage_${fld[0]}`,
					label: fld[1],
					type: fld[2],
					source: fld[3],
					container: fld[4]
				});
			});

			// Hidden fields
			var hiddenFields = ['primarysubs','selectedsubs','fileuploadlink', 'istermsexempt'];
			// Required fields
			var reqFields = ['subsidiary', 'customer', 'aracct', 'account', 'trandate', 'payment', 'cb_consolidatedjedocnum'];
			if(runtime.isFeatureInEffect({ feature: 'MULTICURRENCY' }))
				reqFields.push('currency');
			else
				hiddenFields.push('currency');

			if(!script.getParameter('custscript_custconspayment_hasdepartment'))
				hiddenFields.push('department');

			if(!script.getParameter('custscript_custconspayment_haslocation'))
				hiddenFields.push('location');

			if(script.getParameter('custscript_custconspayment_reqdepartment'))
				reqFields.push('department');

			if(script.getParameter('custscript_custconspayment_reqlocation'))
				reqFields.push('location');

			// Set required fields
			reqFields.forEach(id=>{
				fields[id].isMandatory = true;
			});

			// Set field display type to hidden
			hiddenFields.forEach(id=>{
				fields[id].updateDisplayType({
					displayType: ui.FieldDisplayType.HIDDEN
				});
			});

			// Set field display type to inline
			fields.summary.updateDisplayType({
				displayType: ui.FieldDisplayType.INLINE
			});

			// Set payment amount field size
			fields.payment.updateDisplaySize({
				width: 20,
				height: 1
			});

			// Building summary html;
			fields.trandate.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			});
			fields.summary.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			});
			fields.summary.defaultValue = summaryHTML();

			// Put auto apply beside the amount
			fields.payment.updateLayoutType({
				layoutType: ui.FieldLayoutType.STARTROW
			});
			fields.autoapply.updateLayoutType({
				layoutType: ui.FieldLayoutType.ENDROW
			});

			// Put To Date beside the From Date
			fields.fromdate.updateLayoutType({
				layoutType: ui.FieldLayoutType.STARTROW
			});
			fields.todate.updateLayoutType({
				layoutType: ui.FieldLayoutType.ENDROW
			});

			// Put the pagination to most right
			fields.page.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			});

			// Setting from date and to date defaultValue
			fields.fromdate.defaultValue = params.fromdate || '';
			fields.todate.defaultValue = params.todate || '';

			// Setting date field default value
			fields.trandate.defaultValue = params.trandate || format.format({ type: format.Type.DATE, value: new Date() });

			// Set payment default value
			fields.payment.defaultValue = '0.00';

			// Get File Upload URL
			var scriptId = script.getParameter('custscript_custconspayment_fileupload_sl');
			var deploymentId = script.getParameter('custscript_custconspayment_fileup_depid');
			var attachedFileFolder = script.getParameter('custscript_custconspayment_attfolderid');
			var uploadUrl = url.resolveScript({
				scriptId, deploymentId,
				params: {
					folder: attachedFileFolder
				}
			});
			fields.fileuploadlink.defaultValue = uploadUrl;


			// SETTING SELECT FIELD's OPTION
			// Payment Method
			fields.paymentmethod.addSelectOption({ text: '', value: '' });
			search.create({
				type: 'paymentmethod',
				filters: [['type', 'noneof', '1']],
				columns: [{ name: 'name' }]
			}).run().getRange(0,1000).forEach(res=>{
				fields.paymentmethod.addSelectOption({ text: res.getValue(res.columns[0]), value: res.id });
			});
			// -->>>
			//
			// Customer <<<--
			var custId = [];
			var custOption = [];
			getAllSSResult(search.create({
				type: 'invoice',
				filters: [
					['status', 'anyof', 'CustInvc:A'], 'AND',
					['mainline', 'is', 'T'], 'AND',
					['amount', 'greaterthan', '0.00']
				],
				columns: [{
					name: 'entity',
					summary: 'GROUP',
					sort: search.Sort.ASC
				}, {
					name: 'parent',
					join: 'customer',
					summary: 'GROUP'
				}, {
					name: 'stage',
					join: 'customer',
					summary: 'GROUP'
				}]
			}).run()).forEach(res=>{
				var text = res.getText(res.columns[0]);
				var value = res.getValue(res.columns[0]);
				var stage = res.getValue(res.columns[2]);

				if(custId.indexOf(value) < 0 && stage == 'CUSTOMER'){
					custId.push(value);
					custOption.push({ text, value });
				}

				text = res.getText(res.columns[1]);
				value = res.getValue(res.columns[1]);

				if(custId.indexOf(value) < 0){
					custId.push(value);
					custOption.push({ text, value });
				}
			});
			custOption.sort((a, b) => a.text > b.text && 1 || -1);

			fields.customer.addSelectOption({ text: '', value: '' });
			custOption.forEach(opt=>{
				fields.customer.addSelectOption( opt );
			});
			//  -->>>

			// Load customer record
			var customerRecord = '';
			try{
				if(params.customer)
					customerRecord = record.load({
						type: 'customer',
						id: params.customer
					});
			}catch(e){
				params.customer = '';
			}
			if(customerRecord){

				// Set customer value
				fields.customer.defaultValue = params.customer;
				fields.istermsexempt.defaultValue = customerRecord.getValue({ fieldId: 'custentity_se_discountduetermsexempt' });

				// Set primary subsidiary
				params.primarysubs = customerRecord.getValue({ fieldId: 'subsidiary' });
				fields.primarysubs.defaultValue = params.primarysubs;

				// Set subsidiary options
				var subs = [];

				// Add condition if multi-subsidiary
				if(isMultiSubs){
					search.create({
						type: 'invoice',
						filters: [
							['status', 'anyof', 'CustInvc:A'], 'AND',
							[
								['customersubof', 'anyof', params.customer], 'OR',
								['customer.internalid', 'anyof', params.customer]
							]
						],
						columns: [
							{ name: 'subsidiary', summary: search.Summary.GROUP, sort: search.Sort.ASC }, 
							{ name: 'subsidiarynohierarchy', summary: search.Summary.GROUP }
						]
					}).run().getRange(0,1000).forEach(res=>{
						var text = res.getValue(res.columns[1]);
						var value = res.getValue(res.columns[0]);

						fields.subsidiary.addSelectOption({ text, value });
						
						subs.push(value);
					});

					// Set subsidiary value
					var defaultSubs = [];
					if(params.subsidiary)
						params.subsidiary.forEach(selectedSubs => {
							if(subs.indexOf(selectedSubs) > -1)
								defaultSubs.push(selectedSubs);
						});
					else{
						if(customerRecord.getValue({ fieldId: 'subsidiary' }))
							defaultSubs.push(customerRecord.getValue({ fieldId: 'subsidiary' }));
						else
							defaultSubs.push(subs[0]);
					}

					if(defaultSubs.length)
						params.subsidiary = defaultSubs;
					else
						params.subsidiary = subs;
				}else{
					search.create({
						type: search.Type.CUSTOMER_SUBSIDIARY_RELATIONSHIP,
						filters: [['entity', 'anyof', params.customer]],
						columns: [{ name: 'subsidiary', sort: search.Sort.ASC }]
					}).run().getRange(0,1000).forEach(res=>{
						var text = res.getText(res.columns[0]);
						var value = res.getValue(res.columns[0]);

						text = text.split(' : ');
						text = text[text.length-1];

						fields.subsidiary.addSelectOption({ text, value });
						
						subs.push(value);
					});

					// Set subsidiary value
					params.subsidiary = subs.indexOf(params.subsidiary) > -1? params.subsidiary :
						customerRecord.getValue({ fieldId: 'subsidiary' });
					params.subsidiary = subs.indexOf(params.subsidiary) > -1? params.subsidiary : subs[0];
				}
	log.debug('subs', subs);
				if(!subs.length)
					fields.subsidiary.addSelectOption({
						value: customerRecord.getValue({ fieldId: 'subsidiary' }),
						text: customerRecord.getText({ fieldId: 'subsidiary' })
					});

				fields.subsidiary.defaultValue = params.subsidiary;

				// Set department options
				if(hiddenFields.indexOf('department') < 0){
					var department = [];
					fields.department.addSelectOption({ text: '', value: '' });
					search.create({
						type: 'department',
						filters: [['subsidiary', 'anyof', params.subsidiary], 'AND', ['isinactive', 'is', 'F']],
						columns: [{ name: 'namenohierarchy', sort: search.Sort.ASC }]
					}).run().getRange(0, 1000).forEach(res=>{
						var value = res.id;
						var text = res.getValue(res.columns[0]);

						fields.department.addSelectOption({ text, value });
						department.push(value);
					});
					params.department = department.indexOf(params.department) > -1? params.department: '';
					// Set department value
					fields.department.defaultValue = params.department;
					// --->>
				}


				// Set location options
				if(hiddenFields.indexOf('location') < 0){
					var location = [];
					fields.location.addSelectOption({ text: '', value: '' });
					search.create({
						type: 'location',
						filters: [['subsidiary', 'anyof', params.subsidiary], 'AND', ['isinactive', 'is', 'F']],
						columns: [{ name: 'namenohierarchy', sort: search.Sort.ASC }]
					}).run().getRange(0, 1000).forEach(res=>{
						var value = res.id;
						var text = res.getValue(res.columns[0]);

						fields.location.addSelectOption({ text, value });
						location.push(value);
					});
					params.location = location.indexOf(params.location) > -1? params.location: '';

					// Set department value
					fields.location.defaultValue = params.location;
				}
				// --->>

				// Add currency option
				if(hiddenFields.indexOf('currency') < 0){
					var currencies = [];
					for(var line=0;line<customerRecord.getLineCount({ sublistId: 'currency' });line++){
						fields.currency.addSelectOption({
							value: customerRecord.getSublistValue({ sublistId: 'currency', fieldId: 'currency', line }),
							text: customerRecord.getSublistText({ sublistId: 'currency', fieldId: 'currency', line })
						});

						currencies.push(customerRecord.getSublistValue({ sublistId: 'currency', fieldId: 'currency', line }));
					}
					if(!currencies.length && customerRecord.getValue({ fieldId: 'currency' }))
						fields.currency.addSelectOption({
							value: customerRecord.getValue({ fieldId: 'currency' }),
							text: customerRecord.getText({ fieldId: 'currency' })
						});
					// Set currency value
					params.currency = currencies.indexOf(params.currency) > -1? params.currency :
						customerRecord.getValue({ fieldId: 'currency' });
					params.currency = currencies.indexOf(params.currency) > -1? params.currency : currencies[0];
					fields.currency.defaultValue = params.currency;
				}

				// Add accounts field option
				if(params.subsidiary.length > 1){
					// For primary bank account
					fields.account.addSelectOption({ text: '', value: '' });
					getAllSSResult(search.create({
						type: search.Type.ACCOUNT,
						filters: [
							['type', 'anyof', ['Bank']], 'AND',
							['subsidiary', 'anyof', params.primarysubs], 'AND',
							['issummary', 'is', 'F']
						],
						columns: [
							{ name: 'displayname' },
							{ name: 'name', sort: search.Sort.ASC }
						]
					}).run()).forEach(res=>{
						fields['account'].addSelectOption({
							value: res.id,
							text: res.getValue(res.columns[0])
						});
					});
					// Add Undeposited Funds
					fields.account.addSelectOption({ text: '1050 Undeposited Funds', value: '123' });

					// Sub bank account
					params.subsidiary.forEach( subsId => {
						fields[`account${subsId}`].addSelectOption({ text: '', value: '' });
						getAllSSResult(search.create({
							type: search.Type.ACCOUNT,
							filters: [
								[
									['type', 'anyof', 'Bank'], 'AND',
									['subsidiary', 'anyof', subsId], 'AND',
									['issummary', 'is', 'F']
								], 'OR', [
									['type', 'anyof', 'AcctRec', 'AcctPay'], 'AND',
									['name', 'contains', 'Due']
								]
							],
							columns: [
								{ name: 'displayname' },
								{ name: 'name', sort: search.Sort.ASC }
							]
						}).run()).forEach(res=>{
							fields[`account${subsId}`].addSelectOption({
								value: res.id,
								text: res.getValue(res.columns[0])
							});
						});
						// Add Undeposited Funds
						fields[`account${subsId}`].addSelectOption({ text: '1050 Undeposited Funds', value: '123' });
					});

				}else{
					fields.account.addSelectOption({ text: '', value: '' });
					getAllSSResult(search.create({
						type: search.Type.ACCOUNT,
						filters: [
							[
								['type', 'anyof', ['Bank']], 'AND',
								['subsidiary', 'anyof', params.subsidiary], 'AND',
								['issummary', 'is', 'F']
							], 'OR', [
								['type', 'anyof', 'AcctRec', 'AcctPay'], 'AND',
								['name', 'contains', 'Due']
							]
						],
						columns: [
							{ name: 'displayname' },
							{ name: 'name', sort: search.Sort.ASC }
						]
					}).run()).forEach(res=>{
						fields['account'].addSelectOption({
							value: res.id,
							text: res.getValue(res.columns[0])
						});
					});
					// Add Undeposited Funds
					fields.account.addSelectOption({ text: '1050 Undeposited Funds', value: '123' });
				}
			}

			// Add sublist
			var sublist = form.addSublist({
				id: 'custpage_apply',
				label: 'Invoices',
				type: ui.SublistType.LIST,
				tab: 'custpage_subtab_invoice'
			});

			([
				// [id, label, functionName]
				['payall', 'Pay All', 'payAll();'],
				['autoapply', 'Auto Apply', 'autoApply();'],
				['clear', 'Clear', 'clear();']
			]).forEach(btn=>{
				sublist.addButton({
					id: `custpage_btn${btn[0]}`,
					label: btn[1],
					functionName: btn[2]
				});
			});

			var sublistFields = {};
			([
				//['id', 'label', 'type', 'source'],
				['internalid', 'Internal ID', ui.FieldType.TEXT, null],
				['customer', 'Customer ID', ui.FieldType.TEXT, null],
				['apply', 'Apply', ui.FieldType.CHECKBOX, null],
				['subsidiary', 'Subsidiary ID', ui.FieldType.TEXT, null],
				['subsidiarynohierarchy', 'Subsidiary', ui.FieldType.TEXT, null],
				['trandate', 'Date', ui.FieldType.DATE, null],
				['type', 'Type', ui.FieldType.TEXT, null],
				['tranid', 'Ref No.', ui.FieldType.TEXT, null],
				['amount', 'Orig. Amt.', ui.FieldType.FLOAT, null],
				['amountremaining', 'Amt. Due', ui.FieldType.FLOAT, null],
				['currency', 'Currency', ui.FieldType.SELECT, 'currency'],
				['entity', 'Customer', ui.FieldType.TEXT, null],
				['termsdiscountdate', 'Disc. Date', ui.FieldType.DATE, null],
				['termsdiscountamount', 'Disc. Avail', ui.FieldType.FLOAT, null],
				['discounttaken', 'Disc. Taken', ui.FieldType.FLOAT, null],
				['payment', 'Payment', ui.FieldType.FLOAT, null],
			]).forEach(fld=>{
				sublistFields[fld[0]] = sublist.addField({
					id: `custcol_${fld[0]}`,
					label: fld[1],
					type: fld[2],
					source: fld[3]
				});
			});

			// Set columns display type
			for(var id in sublistFields){
				sublistFields[id].updateDisplayType({
					displayType: ui.FieldDisplayType[
						id.match(/internalid|customer/gi) || id == 'subsidiary'? 'HIDDEN':
						id.match(/apply|payment|discounttaken/gi)? 'ENTRY':
						id.match(/subsidiarynohierarchy/gi) && params.subsidiary.length <= 1? 'HIDDEN':
						!runtime.isFeatureInEffect({ feature: 'MULTICURRENCY' }) && id == 'currency'? 'HIDDEN': 'INLINE'
					]
				});

				// Make entry fields wider
				if(id.match(/payment|discounttaken/gi))
					sublistFields[id].updateDisplaySize({
						width: 40,
						height: 1
					});
			}

			// Add file sublist
			var fileSublist = form.addSublist({
				id: 'custpage_sublist_file',
				label: 'Files',
				type: ui.SublistType.INLINEEDITOR,
				tab: 'custpage_subtab_file'
			});
			var fileSublistFields = {};
			([
				//['id', 'label', 'type', 'source', 'isMandatory', 'displayType'],
				['file', 'Attach File', 'SELECT', null, true, 'ENTRY'],
//				['folder', 'Folder', 'SELECT', 'folder', false, 'DISABLED'],
				['size', 'Size (KB)', 'FLOAT', null, false, 'DISABLED'],
				['modified', 'Last Modified', 'TEXT', null, false, 'DISABLED'],
				['filetype', 'File Type', 'TEXT', null, false, 'DISABLED']
			]).forEach(fld=>{
				fileSublistFields[fld[0]] = fileSublist.addField({
					id: `custcol_${fld[0]}`,
					label: fld[1],
					type: fld[2],
					source: fld[3]
				});

				fileSublistFields[fld[0]].isMandatory = fld[4];
				fileSublistFields[fld[0]].updateDisplayType({
					displayType: ui.FieldDisplayType[fld[5]]
				});
			});

			fileSublistFields.file.addSelectOption({ text: '', value: '' });
			fileSublistFields.file.addSelectOption({ text: '- New -', value: 'new' });

			getAllSSResult( search.create({
				type: 'file',
				filters: [['folder', 'anyof', '14822']],
				columns: [
					{ name: 'name', sort: 'ASC' },
				]
			}).run() ).forEach(res=>{
				fileSublistFields.file.addSelectOption({
					text: res.getValue(res.columns[0]), value: res.id
				});
			});
				
			form.addSubmitButton();
			form.addButton({
				id: 'custpage_btn_cancel',
				label: 'Cancel',
				functionName: ''
			});

			form.clientScriptModulePath = './se_cs_customConsolidatedPayment';

			return {
				form,
				fields,
				sublist,
				sublistFields
			};
		}

		const setSublistValue = (fields, sublist, params) => {
			var filters = [
				['status', 'anyof', 'CustInvc:A'], 'AND',
				['mainline', 'is', 'T']
			];
			filters.push(
				'AND', [
					['customersubof', 'anyof', params.customer], 'OR',
					['customer.internalid', 'anyof', params.customer]
				]
			);
			if(params.subsidiary)
				filters.push('AND', ['subsidiary', 'anyof', params.subsidiary]);
			if(params.currency)
				filters.push('AND', ['currency', 'anyof', params.currency]);

			if(params.fromdate && params.todate){
				filters.push('AND', ['trandate', 'within', [params.fromdate, params.todate]]);
			}else if(params.fromdate){
				filters.push('AND', ['trandate', 'onorafter', params.fromdate]);
			}else if(params.todate){
				filters.push('AND', ['trandate', 'onorbefore', params.todate]);
			}

			// Get default A/R account and set field options
			fields.aracct.addSelectOption({ text: '', value: '' });

			var arAcctSearch = search.create({
				type: 'invoice',
				filters, columns: [
					{ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }
				]
			});

			var aracct = [];
			arAcctSearch.run().getRange(0, 1000).forEach((res, line)=>{
				if(!params.aracct)
					params.aracct = res.getValue(res.columns[0]);

				aracct.push(res.getValue(res.columns[0]));
				fields['aracct'].addSelectOption({
					value: res.getValue(res.columns[0]),
					text: res.getText(res.columns[0])
				});
			});
			params.aracct = aracct.indexOf(params.aracct) < 0? aracct[0]: params.aracct;
			// -->>>

			if(params.aracct)
				filters.push('AND', ['account', 'anyof', params.aracct]);

			// Load invoice search
			var invoiceSearch = search.create({
				type: 'invoice',
				filters, columns: [
					{ name: 'internalid' },
					{ name: 'trandate' },
					{ name: 'type' },
					{ name: 'tranid' },
					{ name: 'amount' },
					{ name: 'amountremaining' },
					{ name: 'currency' },
					{ name: 'account' },
					{ name: 'entity' },
					{ name: 'termsdiscountamount' },
					{ name: 'termsdiscountdate' },
					{ name: 'subsidiarynohierarchy' },
					{ name: 'subsidiary' },
					{ name: 'duedate', sort: search.Sort.ASC },
					{ name: 'internalid', join: 'customer' },
				]
			});

log.debug('filters', filters);
			var lineCount = 0;
			getAllSSResult(invoiceSearch.run()).forEach((res, line)=>{
				res.columns.forEach(col=>{
					var value = col.name.match(/type/gi)? 
						`<a id="apply_displayval" class="dottedlink" href="/app/accounting/transactions/custinvc.nl?id=${res.id}" onclick="setWindowChanged(window, false);">${res.getText(col)}</a>`:
					col.name.match(/entity|subsidiarynohierarchy/gi)?
						res.getText(col) : res.getValue(col);

					if(col.name.match(/entity/gi)){
						var number = value.split(' ')[0];
						value = value.replace(number, '').trim();
						value = number + ' ' + value.split(' : ')[value.split(' : ').length-1];
					}

					if(value)
						sublist.setSublistValue({
							id: `custcol_${col.join || col.name}`,
							value,
							line
						});
				});
				lineCount = line + 1;
			});

			fields.aracct.defaultValue = params.aracct;
			
			var page = 0;
			for(var x=1;x<=lineCount;x+=200){
				fields.page.addSelectOption({
					value: page,
					text: `${x} to ${(x+199)<lineCount? x+199: lineCount} of ${lineCount}`
				});
				page++;
			}
		}
		
		const summaryHTML = () => {
			return `<span class="bgmd totallingbg" style="display:inline-block; position:relative;left: -20px; padding: 10px 25px; margin-bottom:5px;"> <img class="totallingTopLeft" src="/images/nav/ns_x.gif" alt=""> <img class="totallingTopRight" src="/images/nav/ns_x.gif" alt=""> <img class="totallingBottomLeft" src="/images/nav/ns_x.gif" alt=""> <img class="totallingBottomRight" src="/images/nav/ns_x.gif" alt=""> <table class="totallingtable" cellspacing="0" cellpadding="0px" border="0px"> <caption style="display: none">Summary</caption> <tbody><tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="total_fs_lbl" class="smalltextnolink" style=""> <a>To Apply</a> </span></span><span class="uir-field inputreadonly"> <span id="total_fs" class="inputtotalling"><span id="total_val" class="inputtotalling" datatype="currency">0.00</span></span><input name="total" id="total" type="hidden" onchange="nlapiFieldChanged(null,'total');" value="0.00" datatype="currency"> </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="applied_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="applied_fs_lbl" class="smalltextnolink" style=""> <a>Applied</a> </span></span><span class="uir-field inputreadonly"> <span id="applied_fs" class="inputtotalling"><span id="applied_val" class="inputtotalling" datatype="currency">0.00</span></span><input name="applied" id="applied" type="hidden" value="0.00" datatype="currency"> </span> </div> </td> <td></td></tr> <tr><td colspan="3" class="uir-totallingtable-seperator"><div style="border-bottom: 1px solid #000000; width: 100%; font-size: 0px;"></div></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="unapplied_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="unapplied_fs_lbl" class="smalltextnolink" style=""> <a>Unapplied</a> </span></span><span class="uir-field inputreadonly"> <span id="unapplied_fs" class="inputtotalling"><span id="unapplied_val" class="inputtotalling" datatype="currency">0.00</span></span><input name="unapplied" id="unapplied" type="hidden" value="0.00" datatype="currency"> </span> </div> </td> <td></td></tr> </tbody></table> </span>`;
		}

		const postRequest = context => {
			var {request, response} = context;
			var params = request.parameters;
			var discDep = runtime.getCurrentScript().getParameter('custscript_custconspayment_discdep');

			var creditAccount = params.custpage_aracct;
			var primarySubs = params.custpage_primarysubs;

			var paymentAmount = parseFloat( params.custpage_payment || 0 ) * 100;

			// Get Discount Account
			var accountingPref = config.load({
				type: config.Type.ACCOUNTING_PREFERENCES
			});
			var discountAccount = accountingPref.getValue({ fieldId: 'SALESDISCACCT' });

			var paymentLines = {};
			var group = 'custpage_apply';
			var lineCount = request.getLineCount({ group });

			var subs = [];
			var journalLines = {};
			for(var line = 0; line < lineCount; line++){
				var isApplied = request.getSublistValue({ group, name: 'custcol_apply', line });

				if(isApplied == 'F')
					continue;

				var subsidiary = request.getSublistValue({ group, name: 'custcol_subsidiary', line });
				var invoice = request.getSublistValue({ group, name: 'custcol_internalid', line });
				var amount = parseFloat(request.getSublistValue({ group, name: 'custcol_payment', line}) || 0) * 100;
				var discount = parseFloat(request.getSublistValue({ group, name: 'custcol_discounttaken', line}) || 0) * 100;
				var entity = request.getSublistValue({ group, name: 'custcol_customer', line });
				var docNum = request.getSublistValue({ group, name: 'custcol_tranid', line });

				if(!paymentLines[subsidiary]){
					paymentLines[subsidiary] = {};
					subs.push( subsidiary );
				}

				paymentLines[subsidiary][invoice] = {
					amount: amount + discount
				};

				if(!journalLines[subsidiary])
					journalLines[subsidiary] = {};

				if(!journalLines[subsidiary][entity])
					journalLines[subsidiary][entity] = {
						amount: 0,
						discount: 0,
						tranids: []
					};

				journalLines[subsidiary][entity].amount += amount;
				journalLines[subsidiary][entity].discount += discount;
				journalLines[subsidiary][entity].tranids.push(docNum);
			}
log.debug('journalLines', journalLines);

			// Create Journal Record
			var isSingleSub = subs.length == 1 && subs[0] == primarySubs;
			var journalRecord = record.create({
				type: isSingleSub? record.Type.JOURNAL_ENTRY: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
				isDynamic: true
			});

			journalRecord.setValue({
				fieldId: 'subsidiary',
				value: primarySubs
			});

			params.custpage_trandate = format.parse({ type: format.Type.DATE, value: params.custpage_trandate });

			// Set header field values
			(['currency', 'trandate', 'memo', 'custbody_consolidatedjedocnum']).forEach(fieldId=>{
				if(params[`custpage_${fieldId.replace(/(custbody_)/gi,'cb_')}`])
					journalRecord.setValue({
						fieldId, value: params[`custpage_${fieldId.replace(/(custbody_)/gi,'cb_')}`]
					});
			});

			journalRecord.setValue({
				fieldId: 'custbody_consolidated_amount',
				value: params.custpage_payment
			});
			journalRecord.setValue({
				fieldId: 'custbody_consolidatedje',
				value: true
			});

			if(params.custpage_paymentmethod)
				journalRecord.setValue({
					fieldId: 'custbody_consolidated_paymentmethod',
					value: params.custpage_paymentmethod
				});

			journalRecord.setValue({
				fieldId: 'approvalstatus',
				value: 2
			});

			var sublistId = 'line';
			if(isSingleSub){ // Journal Entry
				var lines = journalLines[subsidiary];

				// Debit
				var debitAccount = params.custpage_account;
				journalRecord.selectNewLine({ sublistId });

				journalRecord.setCurrentSublistValue({
					sublistId, fieldId: 'account',
					value: debitAccount
				});
				journalRecord.setCurrentSublistValue({
					sublistId, fieldId: 'debit',
					value: paymentAmount / 100
				});

				if(params.custpage_department)
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'department',
						value: params.custpage_department
					});

				if(params.custpage_location)
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'location',
						value: params.custpage_location
					});

				journalRecord.commitLine({ sublistId });

				var appliedAmount = 0;
				var discountAmount = 0;
				for(var entity in lines){
					// Credit Payment Amount
					journalRecord.selectNewLine({ sublistId });

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'account',
						value: creditAccount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'credit',
						value: lines[entity].amount / 100
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'entity',
						value: entity
					});

					if(params.custpage_department)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'department',
							value: params.custpage_department
						});

					if(params.custpage_location)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'location',
							value: params.custpage_location
						});

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'memo',
						value: lines[entity].tranids.join(', ')
					});
					journalRecord.commitLine({ sublistId });

					// Credit Discount Amount
					if(lines[entity].discount){
						journalRecord.selectNewLine({ sublistId });

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'account',
							value: creditAccount
						});
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'credit',
							value: lines[entity].discount / 100
						});
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'entity',
							value: entity
						});

						if(params.custpage_department)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'department',
								value: params.custpage_department
							});

						if(params.custpage_location)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'location',
								value: params.custpage_location
							});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'memo',
							value: lines[entity].tranids.join(', ')
						});
						journalRecord.commitLine({ sublistId });
					}

					appliedAmount += lines[entity].amount;
					discountAmount += lines[entity].discount;
				}

				// Discount
				if(discountAmount){
					journalRecord.selectNewLine({ sublistId });

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'account',
						value: discountAccount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'debit',
						value: discountAmount / 100
					});

					if(params.custpage_department)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'department',
							value: params.custpage_department
						});

					if(params.custpage_location)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'location',
							value: params.custpage_location
						});

					journalRecord.commitLine({ sublistId });
					
				}

				var unappliedAmount = (paymentAmount - appliedAmount) / 100;

				if(unappliedAmount > 0){
					journalRecord.selectNewLine({ sublistId });

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'account',
						value: creditAccount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'credit',
						value: unappliedAmount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'entity',
						value: entity
					});

					if(params.custpage_department)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'department',
							value: params.custpage_department
						});

					if(params.custpage_location)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'location',
							value: params.custpage_location
						});

					journalRecord.commitLine({ sublistId });
				}

			}else{ // Multi-subsidiary / Advance Intercompany Journal Entry

				// Debit
				var debitAccount = params.custpage_account;
				journalRecord.selectNewLine({ sublistId });

				journalRecord.setCurrentSublistValue({
					sublistId, fieldId: 'subsidiary',
					value: primarySubs
				});

				journalRecord.setCurrentSublistValue({
					sublistId, fieldId: 'account',
					value: debitAccount
				});
				journalRecord.setCurrentSublistValue({
					sublistId, fieldId: 'debit',
					value: paymentAmount / 100
				});

				if(params.custpage_department)
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'department',
						value: params.custpage_department
					});

				if(params.custpage_location)
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'location',
						value: params.custpage_location
					});

				journalRecord.commitLine({ sublistId });

				var appliedAmount = 0;
				for(var subsidiary in journalLines){
					var discountAmount = 0;
					var lines = journalLines[subsidiary];

					if(subsidiary != primarySubs){ // Different Subsidiary

						// Get interco account
						var toSubsAccount = '';
/*						search.create({
							type: 'customrecord_salora_interco_je',
							filters: ['custrecord_intercotosub', 'anyof', subsidiary],
							columns: [{ name: 'custrecord_intercoacct' }]
						}).run().getRange(0,1).forEach(res=>{
							toSubsAccount = res.getValue( res.columns[0] );
						});
*/
						var amount = 0;
						for(var x in lines)
							amount += lines[x].amount;

						// From Account
						journalRecord.selectNewLine({ sublistId });

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'linesubsidiary',
							value: primarySubs
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'account',
							//value: toSubsAccount
							value: params[`custpage_account${subsidiary}`]
						});
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'credit',
							value: amount / 100
						});

						if(params.custpage_department)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'department',
								value: params.custpage_department
							});

						if(params.custpage_location)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'location',
								value: params.custpage_location
							});

						journalRecord.commitLine({ sublistId });

						// To Account
						journalRecord.selectNewLine({ sublistId });

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'linesubsidiary',
							value: subsidiary
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'account',
							value: params[`custpage_account${subsidiary}`]
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'debit',
							value: amount / 100
						});

						journalRecord.commitLine({ sublistId });
					}

					for(var entity in lines){
						journalRecord.selectNewLine({ sublistId });

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'linesubsidiary',
							value: subsidiary
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'account',
							value: creditAccount
						});
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'credit',
							value: lines[entity].amount / 100
						});
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'entity',
							value: entity
						});

						if(subsidiary == primarySubs){
							if(params.custpage_department)
								journalRecord.setCurrentSublistValue({
									sublistId, fieldId: 'department',
									value: params.custpage_department
								});

							if(params.custpage_location)
								journalRecord.setCurrentSublistValue({
									sublistId, fieldId: 'location',
									value: params.custpage_location
								});
						}

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'memo',
							value: lines[entity].tranids.join(', ')
						});
						journalRecord.commitLine({ sublistId });

						// Credit Discount Amount
						if(lines[entity].discount){
							journalRecord.selectNewLine({ sublistId });

							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'linesubsidiary',
								value: subsidiary
							});

							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'account',
								value: creditAccount
							});
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'credit',
								value: lines[entity].discount / 100
							});
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'entity',
								value: entity
							});

							if(params.custpage_department || discDep)
								journalRecord.setCurrentSublistValue({
									sublistId, fieldId: 'department',
									value: discDep || params.custpage_department
								});

							if(params.custpage_location)
								journalRecord.setCurrentSublistValue({
									sublistId, fieldId: 'location',
									value: params.custpage_location
								});

							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'memo',
								value: lines[entity].tranids.join(', ')
							});
							journalRecord.commitLine({ sublistId });
						}

						appliedAmount += lines[entity].amount;
						discountAmount += lines[entity].discount;
					}
log.debug('discount - ' + subsidiary, discountAmount);

					// Debit Discount Line
					if(discountAmount){

						journalRecord.selectNewLine({ sublistId });

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'linesubsidiary',
							value: subsidiary
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'account',
							value: discountAccount
						});

						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'debit',
							value: discountAmount / 100
						});

						if(params.custpage_department || discDep)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'department',
								value: discDep || params.custpage_department
							});

						if(params.custpage_location)
							journalRecord.setCurrentSublistValue({
								sublistId, fieldId: 'location',
								value: params.custpage_location
							});

						journalRecord.commitLine({ sublistId });
					}
				}

				var unappliedAmount = ( paymentAmount - appliedAmount ) / 100;

				if(unappliedAmount > 0){
					journalRecord.selectNewLine({ sublistId });

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'linesubsidiary',
						value: primarySubs
					});

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'account',
						value: creditAccount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'credit',
						value: unappliedAmount
					});
					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'entity',
						value: params.custpage_customer
					});

					if(params.custpage_department)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'department',
							value: params.custpage_department
						});

					if(params.custpage_location)
						journalRecord.setCurrentSublistValue({
							sublistId, fieldId: 'location',
							value: params.custpage_location
						});

					journalRecord.setCurrentSublistValue({
						sublistId, fieldId: 'memo',
						value: 'Unapplied Amount'
					});

					journalRecord.commitLine({ sublistId });
				}
			}

			// Save journal record
			var journalRecordId = journalRecord.save();

			// Attached files
			group = 'custpage_sublist_file';
			lineCount = request.getLineCount({ group });
			for(var line=0;line<lineCount;line++){
				var fileId = request.getSublistValue({ group, name: 'custcol_file', line });

				record.attach({
					record: { type: 'file', id: fileId },
					to: { type: 'journalentry', id: journalRecordId }
				});
			}

			log.debug('journalRecordId', journalRecordId);

			for(var subsidiary in journalLines)
				for(var x in journalLines[subsidiary]){
					var paymentRecord = record.create({
						type: record.Type.CUSTOMER_PAYMENT,
						isDynamic: true
					});

					paymentRecord.setValue({
						fieldId: 'customer',
						value: x
					});

					// Set header fields
					(['currency', 'aracct', 'account', 'trandate', 'memo', 'department', 'location']).forEach(fieldId=>{
						if(!isSingleSub && fieldId.match(/department|location/gi))
							return;

						var value = params[`custpage_${fieldId}`];

						if( !isSingleSub && fieldId == 'account' )
							value = null;//params[`custpage_account${subsidiary}`]

						if(value)
							paymentRecord.setValue({ fieldId, value });
					});

					if(!isSingleSub)
						paymentRecord.setValue({ fieldId: 'undepfunds', value: 'T' });

					var paymentAmount = 0;

					var sublistId = 'apply';
					var lineCount = paymentRecord.getLineCount({ sublistId });
					for(var line=0;line<lineCount;line++){
						var id = paymentRecord.getSublistValue({ sublistId, fieldId: 'internalid', line });

						if(!paymentLines[subsidiary][id])
							continue;

						paymentAmount += paymentLines[subsidiary][id].amount;

						paymentRecord.selectLine({ sublistId, line });
						paymentRecord.setCurrentSublistValue({ sublistId, fieldId: 'apply', value: true });
						paymentRecord.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: paymentLines[subsidiary][id].amount });
						paymentRecord.commitLine({ sublistId });
					}

					sublistId = 'credit';
					var lineCount = paymentRecord.getLineCount({ sublistId });
					for(var line=0;line<lineCount;line++){
						var id = paymentRecord.getSublistValue({ sublistId, fieldId: 'internalid', line });

						if(id != journalRecordId )
							continue;

						paymentRecord.selectLine({ sublistId, line });
						paymentRecord.setCurrentSublistValue({ sublistId, fieldId: 'apply', value: true });
						paymentRecord.setCurrentSublistValue({ sublistId, fieldId: 'amount', value: paymentAmount });
						paymentRecord.commitLine({ sublistId });
					}

					try{
						var paymentRecordId = paymentRecord.save();
					}catch(e){log.debug('ERROR', e);}
				}

			var script = runtime.getCurrentScript();
			redirect.toSuitelet({
				scriptId: script.id,
				deploymentId: script.deploymentId,
				parameters: {
					je: journalRecordId
				}
			});
		}

		// Get all saved search results.
		const getAllSSResult = searchResultSet => {
			var result = [];
			for(var x=0;x<=result.length;x+=1000)
				result = result.concat(searchResultSet.getRange(x,x+1000)||[]);
			return result;
		}

		return {
			onRequest
		};
		
	}
);
