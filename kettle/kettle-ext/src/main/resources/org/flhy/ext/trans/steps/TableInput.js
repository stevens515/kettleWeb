TableInputDialog = Ext.extend(KettleDialog, {
	title: '表输入',
	width: 600,
	height: 500,
	bodyStyle: 'padding: 5px;',
	initComponent: function() {
		var me = this,  graph = getActiveGraph().getGraph(),  cell = graph.getSelectionCell();
		
		var onDatabaseCreate = function(dialog) {
			var root = graph.getDefaultParent();
			var databases = root.getAttribute('databases');
			var jsonArray = Ext.decode(databases);
			jsonArray.push(dialog.getValue());
			graph.getModel().beginUpdate();
            try
            {
				var edit = new mxCellAttributeChange(root, 'databases', Ext.encode(jsonArray));
            	graph.getModel().execute(edit);
            } finally
            {
                graph.getModel().endUpdate();
            }
			
            wConnection.setValue(dialog.getValue().name);
            dialog.close();
		};
		
		var wConnection = new Ext.form.ComboBox({
			flex: 1,
			displayField: 'name',
			valueField: 'name',
			typeAhead: true,
	        mode: 'local',
	        forceSelection: true,
	        triggerAction: 'all',
	        selectOnFocus:true,
			store: getActiveGraph().getDatabaseStore(),
			name: 'connection',
			value: cell.getAttribute('connection')
		});
		var wSQL = new Ext.form.TextArea({ region: 'center', emptyText: '执行查询的SQL语句' });
		if(!Ext.isEmpty(cell.getAttribute('sql')))
			wSQL.setValue(decodeURIComponent(cell.getAttribute('sql')));
		var wLazyConversion = new Ext.form.Checkbox({ fieldLabel: '允许简易转换', checked: cell.getAttribute('lazy_conversion_active') == 'Y' });
		var wVariables = new Ext.form.Checkbox({ fieldLabel: '替换SQL语句里的变量', checked: cell.getAttribute('variables_active') == 'Y' });
		var wDatefrom = new Ext.form.ComboBox({
			fieldLabel: '从步骤插入数据',
			anchor: '-10',
			displayField: 'name',
			valueField: 'name',
			typeAhead: true,
	        mode: 'local',
	        forceSelection: true,
	        triggerAction: 'all',
	        selectOnFocus:true,
			store: getActiveGraph().inputOutputFields(cell.getAttribute('label'), true),
			value: cell.getAttribute('lookup')
		});
		var wEachRow = new Ext.form.Checkbox({ fieldLabel: '执行每一行', checked: cell.getAttribute('execute_each_row') == 'Y' });
		var wLimit = new Ext.form.TextField({ fieldLabel: '记录数量限制', anchor: '-10', value: cell.getAttribute('limit') || 0 });
		
		this.getValues = function(){
			return {
				connection: wConnection.getValue(),
				sql: encodeURIComponent(wSQL.getValue()),
				limit: wLimit.getValue(),
				lookup: wDatefrom.getValue(),
				lazy_conversion_active: wLazyConversion.getValue() ? "Y" : "N",
				variables_active: wVariables.getValue() ? "Y" : "N",
				execute_each_row: wEachRow.getValue() ? "Y" : "N"
			};
		};
		
		this.fitItems = {
			layout: 'border',
			border: false,
			defaults: {border: false},
			items: [{
				region: 'north',
				height: 30,
				labelWidth: 65,
				items: [{
					xtype: 'compositefield',
					fieldLabel: '数据库连接',
					items: [wConnection, {
						xtype: 'button', text: '编辑...', handler: function() {
							var store = getActiveGraph().getDatabaseStore();
							store.each(function(item) {
								if(item.get('name') == wConnection.getValue()) {
									var databaseDialog = new DatabaseDialog();
									databaseDialog.on('create', onDatabaseCreate);
									databaseDialog.show(null, function() {
										databaseDialog.initDatabase(item.json);
									});
								}
							});
						}
					}, {
						xtype: 'button', text: '新建...', handler: function() {
							var databaseDialog = new DatabaseDialog();
							databaseDialog.on('create', onDatabaseCreate);
							databaseDialog.show();
						}
					}, {
						xtype: 'button', text: '向导...'
					}, {
						xtype: 'button', text: '获取SQL查询语句..', handler: function() {
							var store = getActiveGraph().getDatabaseStore();
							store.each(function(item) {
								if(item.get('name') == wConnection.getValue()) {
									me.getSQL(item.json, wSQL);
								}
							});
						}
					}]
				}]
			}, wSQL, {
				xtype: 'form',
				region: 'south',
				height: 130,
				labelWidth: 150,
				items:[wLazyConversion, wVariables, wDatefrom, wEachRow, wLimit]
			}]
		};
		
		TableInputDialog.superclass.initComponent.call(this);
	},
	
	getSQL: function(dbInfo, wSQL) {
		var dialog = new DatabaseExplorerDialog();
		dialog.on('select', function(node) {
			wSQL.setValue('select * from ' + node.attributes.fullText);
			dialog.close();
			
			Ext.Msg.show({
				   title:'系统提示',
				   msg: '你想在SQL里面包含字段名吗？',
				   buttons: Ext.Msg.YESNO,
				   icon: Ext.MessageBox.QUESTION,
				   fn: function(bId) {
					   if(bId == 'yes') {
						   Ext.Ajax.request({
								url: GetUrl('trans/fieldNames.do'),
								method: 'POST',
								params: {graphXml: getActiveGraph().toXml(), databaseName: dbInfo.name, sql: encodeURIComponent(wSQL.getValue())},
								success: function(response, opts) {
									decodeResponse(response, function(resObj) {
										wSQL.setValue(decodeURIComponent(resObj.message));
									});
								}
						   });
					   }
				   }
			});
			
		});
		dialog.show(null, function() {
			dialog.initDatabase(dbInfo);
		});
	}
	
});

Ext.reg('TableInput', TableInputDialog);