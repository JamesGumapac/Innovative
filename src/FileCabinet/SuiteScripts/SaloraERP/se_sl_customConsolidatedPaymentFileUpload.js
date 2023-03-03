/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/file', 'N/ui/serverWidget', 'N/search'],

	(file, ui, search) => {
	   
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
			var { request, response } = context;
			var params = request.parameters;

			var form = ui.createForm({
				title: 'File',
				hideNavBar: true
			});

			var fields = {};
			([
				['filename', 'File Name', 'TEXT'],
				['folder', 'Folder', 'SELECT'],
				['file', 'Select File', 'FILE'],
			]).forEach(fld=>{
				fields[fld[0]] = form.addField({
					id: `custpage_${fld[0]}`,
					label: fld[1],
					type: ui.FieldType[fld[2]]
				});

				if(fld[0] == 'folder')
					fields[fld[0]].updateDisplayType({
						displayType: 'DISABLED'
					});
			});

			fields.file.isMandatory = true;

			fields.filename.updateBreakType({
				breakType: ui.FieldBreakType.STARTCOL
			})
			
			if(params.folder){
				var folderName = search.lookupFields({
					type: 'folder',
					id: params.folder,
					columns: ['name']
				}).name;

				fields.folder.addSelectOption({ text: folderName, value: params.folder, isSelected: true });
			}

			form.addSubmitButton({ label: 'Save' });
			form.addButton({ label: 'Cancel', id: 'custpage_btn_cancel',
				functionName: `parent.nlapiSetCurrentLineItemValue('custpage_sublist_file', 'custcol_file', ''); parent.jQuery('.x-tool-close').click();` });

			response.writePage(form);
		}

		const postRequest = context => {
			var { request, response } = context;
			var params = request.parameters;

			var uploadedFile = request.files.custpage_file;
			if(params.custpage_filename)
				uploadedFile.name = params.custpage_filename;

			uploadedFile.folder = params.custpage_folder;

			var fileId = uploadedFile.save();

			var form = ui.createForm({
				title: 'File',
				hideNavBar: true
			});
			var field = form.addField({
				id: 'custpage_script',
				label: 'Script',
				type: ui.FieldType.INLINEHTML
			});
			field.defaultValue = `
				<script>
					parent.nlapiSetFieldValue('custpage_fileuploaded', '{"text":"${uploadedFile.name}", "value":"${fileId}"}');
					parent.jQuery('.x-tool-close').click();
				</script>
			`;

			response.writePage(form);
		}

		return {
			onRequest
		};
		
	}
);
