/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/format', 'N/record', 'N/render', 'N/search', 'N/ui/serverWidget', 'N/url', 'N/runtime'],

	(format, record, render, search, ui, url, runtime) => {
	   
		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		const onRequest = context => {
			var { request, response } = context;
			var params = request.parameters;

			var form = ui.createForm({
				title: 'Invoice Approval'
			});

			// Get invoice id
			var invoiceId = params.custpage_internalid || params.rid || getInvoiceId(params, form);
			if(!invoiceId){
				response.writePage(form);
				return;
			}

			if(params.pdf){
log.debug('invoiceid', invoiceId);
				response.writeFile(render.transaction({
					entityId: parseInt(invoiceId),
					printMode: render.PrintMode.PDF
				}), true);
				return;
			}


			// Load Invioce record
			var invoiceRecord = record.load({
				type: 'invoice',
				id: invoiceId
			});

			var isAlreadyOpened = invoiceRecord.getValue({
				fieldId: 'custbody_salora_approvallinkopened'
			});
			if(!isAlreadyOpened){
				try{
					record.submitFields({
						type: 'invoice',
						id: invoiceId,
						values: {
							custbody_salora_approvallinktimestamp: Date.parse(new Date()).toString()
						}
					});
				}catch(e){
					log.debug('ERROE', e);
				}
			}

			var fields = {};
			([
/*				['tranid', 'Invoice #', ui.FieldType.TEXT, null],
				['trandate', 'Date', ui.FieldType.TEXT, null],
				['memo', 'Memo', ui.FieldType.LONGTEXT, null],
*/				['reason', 'Reason', ui.FieldType.LONGTEXT, null],
				['internalid', 'InternalID', ui.FieldType.TEXT, null],
				['action', 'Action', ui.FieldType.TEXT, null],
				['summary', ' ', ui.FieldType.INLINEHTML, null]
			]).forEach(fld=>{
				fields[fld[0]] = form.addField({
					id: `custpage_${fld[0]}`,
					label: fld[1],
					type: fld[2],
					source: fld[3]
				});
			});

			(['action', 'reason', 'internalid']).forEach(fid=>{
				fields[fid].updateDisplayType({
					displayType: ui.FieldDisplayType.HIDDEN
				});
			});

			// Setting main field values
			for(var fieldId in fields)
				fields[fieldId].defaultValue = invoiceRecord.getValue({ fieldId });

			fields.internalid.defaultValue = invoiceRecord.id;

/*			(['tranid', 'trandate', 'memo']).forEach(fid=>{
				fields[fid].updateDisplayType({
					displayType: ui.FieldDisplayType.INLINE
				});
			});

			fields.summary.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			});
			fields.summary.updateLayoutType({
				layoutType: ui.FieldLayoutType.ENDROW
			});

			var sublist = form.addSublist({
				id: 'custpage_item',
				type: ui.SublistType.LIST,
				label: 'Items'
			});
			var sublistFields = {};
			([
				['item', 'Item', ui.FieldType.TEXT, null],
				['rate', 'Rate', ui.FieldType.FLOAT, null],
				['quantity', 'Quantity', ui.FieldType.FLOAT, null],
				['unit', 'Units', ui.FieldType.TEXT, null],
				['amount', 'Amount', ui.FieldType.FLOAT, null],
			]).forEach(fld=>{
				sublistFields[fld[0]] = sublist.addField({
					id: `custcol_${fld[0]}`,
					label: fld[1],
					type: fld[2],
					source: fld[3]
				});
			});

			// Add summary fields
			var summaryHtml = getSummaryTemplate();
			summaryHtml.match(/({{.*?}})/gi).forEach(id=>{
				fieldId = id.replace(/[{}]/gi,'');

				summaryHtml = summaryHtml.replace(id, (invoiceRecord.getValue({ fieldId }) || '&nbsp;'));
			});
			fields.summary.defaultValue = summaryHtml;

			var sublistId = 'item';
			var lineCount = invoiceRecord.getLineCount({ sublistId });
			for(var line=0;line<lineCount;line++){
				for(var fieldId in sublistFields){
					var value = invoiceRecord.getSublistText({ sublistId, fieldId, line }) ||
							invoiceRecord.getSublistValue({ sublistId, fieldId, line }) || null;
					if(fieldId.match(/quantity|amount/gi))
						value = parseFloat(value) || 0;

					sublist.setSublistValue({
						id: `custcol_${fieldId}`,
						value,
						line
					});
				}
			}
*/

			var html = render.transaction({
				entityId: parseInt(invoiceId),
				printMode: render.PrintMode.HTML
			}).getContents().replace(/img/gi,`img style="height: 164px;width: 480px;"`);


			var lookup = search.lookupFields({
				type: 'invoice',
				id: invoiceId,
				columns: ['terms', 'duedate']
			});

			html = html.replace(`{terms}`, lookup['terms'][0].text);
			html = html.replace(`{duedate}`, lookup['duedate']);

			// Set html content
			fields.summary.defaultValue = html;
			var script = runtime.getCurrentScript();

			if(params.custpage_action){
				var values = {
					custbody_inv_approval_status: params.custpage_action == 'approve'? '2': '3',
					custbody_salora_rejectedreason: params.custpage_reason || null
				}

//				if(params.custpage_action == 'approve'){

					var currentDate = Date.parse(new Date());

					var key = Math.random().toString(36).substring(2) +
						currentDate.toString(36);
					
					var slURL = url.resolveScript({
						scriptId: script.id,
						deploymentId: script.deploymentId,
						returnExternalUrl: true,
						params: {
							tid: key
						}
					});

					values['custbody_salora_invoiceapprovaltoken'] = key;
					values['custbody_salora_approvallink'] = slURL;
					values['custbody_salora_approvallinktimestamp'] = '';
					values['custbody_salora_approvallinkopened'] = false;
//				}

				record.submitFields({
					type: 'invoice',
					id: invoiceRecord.id,
					values
				});

				fields.action.defaultValue = params.custpage_action;
			}else{
				form.addSubmitButton({ label: 'Approve' });
				form.addButton({
					id: 'custpage_btnreject',
					label: 'Reject',
					functionName: 'reject();'
				});
			}

			var sURL = url.resolveScript({
				scriptId: script.id,
				deploymentId: script.deploymentId,
				returnExternalUrl: true,
				params: {
					rid: invoiceId,
					pdf: 'T'
				}
			});

			form.addButton({
				id: 'custpage_print',
				label: 'Print',
				functionName: `printPDF('${params.custpage_action?sURL:''}');`
			});

			form.clientScriptModulePath = `./se_cs_customInvoiceApproval`;

			response.writePage(form);
		}

		/*
		 *This function will get the invoice id based on the token provided. This will validate the token as well.
		 * */
		const getInvoiceId = (params, form) => {
			var script = runtime.getCurrentScript();
			var validityUponOpened = script.getParameter('custscript_salora_linkvaliditywhenopened') || 1;

			if(!params.tid){
				form.title = 'Invalid URL';
				return;
			}

			var invoiceId = search.create({
				type: 'invoice',
				filters: [
					['custbody_salora_invoiceapprovaltoken', 'is', params.tid]
				],	
				columns: [
					{ name: 'custbody_salora_approvallinkvalidity' },
					{ name: 'custbody_inv_approval_status' },
					{ name: 'tranid' }
//					{ name: 'custbody_salora_approvallinktimestamp' },
				]
			}).run().getRange(0,1).map(res=>{
log.debug('res.getAllValues()', res.getAllValues());
				return {
					id: res.id,
					datecreated: parseFloat(res.getValue(res.columns[0])),
//					timestampopened: parseFloat(res.getValue(res.columns[1])) + (86400000 * validityUponOpened),
					status: res.getValue(res.columns[1]),
					tranid: res.getValue(res.columns[2])
				}; 
			});

			if(!invoiceId.length){
				form.title = 'This link could be expired or invalid.';
				return;
			}else{
				var { tranid, datecreated, timestampopened, status } = invoiceId[0];
				var currentDateTime = Date.parse(new Date());

//log.debug('currentDateTime', currentDateTime);
//log.debug('openedTimeStamp', openedTimeStamp);
//log.debug('dateCreated', dateCreated);
				if(currentDateTime > datecreated){// || currentDateTime > timestampopened){
					form.title = `This link for Invoice #${tranid} already expired.`;
					return;
				}
				if(invoiceId[0].status == '2' || invoiceId[0].status == '3'){
					form.title = `This Invoice #${tranid} already ${invoiceId[0].status=='2'? 'approved.': 'rejected.'}`;
					return;
				}
			}

			return invoiceId[0].id;
		}

		const getSummaryTemplate = () => {
			return `<span class="bgmd totallingbg" style="display:none; position:relative; right:100px; padding: 10px 25px; margin-bottom:5px;"> <img class="totallingTopLeft" src="/images/nav/ns_x.gif" alt=""> <img class="totallingTopRight" src="/images/nav/ns_x.gif" alt=""> <img class="totallingBottomLeft" src="/images/nav/ns_x.gif" alt=""> <img class="totallingBottomRight" src="/images/nav/ns_x.gif" alt=""> <table class="totallingtable" cellspacing="2" cellpadding="0px" border="0px"> <caption style="display: none;background-color:#607799;">Summary</caption> <tbody><tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="subtotal_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="subtotal_fs_lbl" class="smalltextnolink" style=""> <a>Subtotal</a> </span></span><span class="uir-field inputreadonly"> {{subtotal}} </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="discounttotal_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="discounttotal_fs_lbl" class="smalltextnolink" style=""> <a>Discount Item</a> </span></span><span class="uir-field inputreadonly"> {{discounttotal}} </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="taxtotal_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="taxtotal_fs_lbl" class="smalltextnolink" style=""> <a>Tax Total</a> </span></span><span class="uir-field inputreadonly"> {{taxtotal}} </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="altshippingcost_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="altshippingcost_fs_lbl" class="smalltextnolink" style=""> <a>Shipping Cost</a> </span></span><span class="uir-field inputreadonly"> {{altshippingcost}} </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="total_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="total_fs_lbl" class="smalltextnolink" style=""> <a>Total</a> </span></span><span class="uir-field inputreadonly"> {{total}} </span> </div> </td> <td></td></tr> <tr> <td> <div class="uir-field-wrapper" data-field-type="currency"><span id="amountremainingtotalbox_fs_lbl_uir_label" class="smalltextnolink uir-label "><span id="amountremainingtotalbox_fs_lbl" class="smalltextnolink" style=""> <a>Amount Due</a> </span></span><span class="uir-field inputreadonly"> {{amountremainingtotalbox}} </span> </div> </td> <td></td></tr> </tbody></table> </span>`;
		}

		return {
			onRequest
		};
		
	});
