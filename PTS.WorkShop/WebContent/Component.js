sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
	"use strict";

	return UIComponent.extend("PTS.Workshop.Component", {

		metadata : {
			manifest: "json"
		},

		init : function () {
			// call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);

			var localModel = new sap.ui.model.json.JSONModel();
	    	
	    	sap.ui.getCore().setModel(localModel);
	    
		}
	});

});
