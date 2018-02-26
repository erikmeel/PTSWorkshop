sap.ui.controller("views.App", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf pts.workshop.App
*/
	onInit: function() {
		var oDateTime = this.getView().byId("idDateTime");
		//var oTime = this.getView().byId("lblTime");
        var result = this.GetClock();
        oDateTime.setText(result[0]+" "+result[1]);
        //oTime.setText(result[1]);
        var that = this;
        setInterval(function() {
          var result = that.GetClock();
          oDateTime.setText(result[0]+" "+result[1]);
        }, 1000);
        
        this.readUserInfo();
        
        var cmbCustomers = this.getView().byId("idCustomerCombo");
        var bnd = cmbCustomers.getBinding("items");

        oModel.setProperty("/equipmentfound", false);
		oModel.setProperty("/equipment/checked_in",false);
		
	},

/**
* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
* (NOT before the first rendering! onInit() is used for that one!).
* @memberOf pts.workshop.App
*/
	onBeforeRendering: function() {

	},

/**
* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
* This hook is the same one that SAPUI5 controls get after being rendered.
* @memberOf pts.workshop.App
*/
	onAfterRendering: function() {
		var oSerialNr = this.getView().byId("idSerialNr");
		oSerialNr.focus();
		
		var mainPage = this.byId("mainPage");

        mainPage.setShowFooter(false);

		
	},

/**
* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
* @memberOf pts.workshop.App
*/
//	onExit: function() {
//
//	}
	
	serialChange: function(t) {
		var curr = this.byId("idCustomerInput");
    	var cmb = this.byId("idCustomerCombo");
    	var mainPage = this.byId("mainPage");
    	var eqList = this.byId("idFlexEquipment");
    	var eqState = this.byId("idCurrentState");
    	var ser = this.byId("idSerialNr");
    	var flowIconTabItem = this.byId("idServiceFlow");
    	var subIconBar = this.byId("idSubIconBar");
    	
    	curr.setVisible(true);
    	cmb.setVisible(false);
    	
    	//Clear list of found customers in model as we search now on serial
    	cmb.removeAllItems();
    	var aCustomers = [];
    	oModel.setProperty("/customers", aCustomers);
    	
    	//Clear equipment
		var aEquipment = [];
		
		var sernr;
		
		if(t.mParameters.value)
			sernr = t.mParameters.value;
		else 
			sernr = ser.mProperties["value"];
		
		sernr = sernr.toUpperCase();
		var equipment = {
				'serial_number': sernr
		}
	
		aEquipment.push(equipment);
		oModel.setProperty("/equipment", aEquipment[0]);
		
		var j = {
			    'serial_number': sernr
			  }
		
		if(sernr.length > 8) {
			var aData = jQuery.ajax({
				type: "GET",
			    contentType: "application/json", 
			    url: "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN",
				data: {"json": JSON.stringify(j), "action": "get_by_serial"},
			    dataType: "json", 
			    success: function(data, textStatus, jqXHR){ 
				
					var result = data[0].model;
					//Test if data has been found
					if (result.length > 0) {
						
						//If the result contains 1 data set, then 1 equipment is found and can be displayed
						if(result.length === 1) {
							aEquipment = [];
							aEquipment.push(result[0]);
							
							oModel.setProperty("/equipment", aEquipment[0]);
							oModel.setProperty("/equipment/serial_number_id", result[0].serial_number+" (SAP id: "+result[0].id+")");
							
							if(result[0].user_status && result[0].user_status.indexOf("ZCC1")!==-1) {
								oModel.setProperty("/equipment/checked_in","Checked-In");
								oModel.setProperty("/checkinButton", "Start Service Repair");
								eqState.addStyleClass("InfoStateRed");
							}
							else {
								oModel.setProperty("/equipment/checked_in","Unknown");
								oModel.setProperty("/checkinButton", "Check in");
								eqState.addStyleClass("InfoStateGreen");
							}
							
							oModel.setProperty("/equipmentfound", true);
							flowIconTabItem.setVisible(true);
							subIconBar.setSelectedKey(flowIconTabItem.sId);
							curr.setEnabled(false);
							mainPage.setShowFooter(true);
						} 
					
					//If no data is found, reset content of other fields, areas...	
					} else {
						curr.setEnabled(true);
						flowIconTabItem.setVisible(false);
						mainPage.setShowFooter(false);
					} 
				},  
				error: function(json) {  alert("fail to post"); } });
		} else {
			curr.setEnabled(true);
			flowIconTabItem.setVisible(false);
			mainPage.setShowFooter(false);
		} 
	},
	
	customerInputChange: function(t) {
		var custn = t.mParameters.value;
		var userinfo = oModel.getProperty("/userinfo");
		var salesorg = userinfo[0].default_sales_org;
		var division = userinfo[0].default_division;
		var customersFound = 0;
		var aCustomers = oModel.getProperty("/customers");
		if(aCustomers && aCustomers.length > 0) 
			customersFound = aCustomers.length;
		
		var aEquipment = oModel.getProperty("/equipment");
		aEquipment = [];
		
		//custn = custn.toUpperCase();
		var equipment = {
				'installed_at_name': custn
		}
	
		aEquipment.push(equipment);
		oModel.setProperty("/equipment", aEquipment[0]);
		
		
		if(this.isNumeric(custn)) {
			//if it is a number, then read using customer number
			
		} else {
			//GET_BY_ADDRESS_C4S
			var aAccountGrps = [];
			aAccountGrps.push("Z002");
			
			if(custn.length >= 4) {
				var j = {
						'name': custn,
						'country': salesorg.substring(0,2),
						'sales_org': salesorg,
						'distr_chn': '01',
						'division': division,
						'account_grps':  aAccountGrps
				}
				
				var aData = jQuery.ajax({
					type: "GET",
				    contentType: "application/json", 
				    url: "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN",
					data: {"json": JSON.stringify(j), "action": "get_by_address"},
				    dataType: "json", 
				    success: function(data, textStatus, jqXHR){ 
					
						var result = data[0].model;
						if (result.length > 0) {
							oModel.setProperty("/customers", result);
							customersFound = result.length;
						} else {
							oModel.setProperty("/customers", null);
						};
					},  
					error: function(json) {  alert("fail to post"); } });
			}
		}
		this.getView().setModel(oModel,"dataModel");
		//if(customersFound > 0)
			this.fillCustomerCombo();
		
	},
	
	customerDropDownChange: function(t) {
		var curr = this.byId("idCustomerInput");
		var cmb = this.byId("idCustomerCombo");
		var equipmentFound = 0;
		
		if(cmb.getValue()=="") {
			curr.mProperties.value = "";
			aCustomers = [];
			oModel.setProperty("/customers",aCustomers);
			curr.setVisible(true);
			cmb.setVisible(false);
		} else {
			
			this.getEquipmentFromCustomer(cmb.getSelectedKey());
			
			var eqModel = this.getView().getModel("dataModel");
			if(eqModel) {
				eqModel.updateBindings(true);
			}			
		}
	},
	
	isNumeric: function(n) {
		  return !isNaN(parseFloat(n)) && isFinite(n);
	},
	
	GetClock: function() {

        var tday = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
        var tmonth = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
        var d = new Date();
        var nday = d.getDay(),
          nmonth = d.getMonth(),
          ndate = d.getDate(),
          nyear = d.getYear(),
          nhour = d.getHours(),
          nmin = d.getMinutes(),
          nsec = d.getSeconds()
          
        if (nyear < 1000) nyear += 1900;
        if (nmin <= 9) nmin = "0" + nmin;
        if (nsec <= 9) nsec = "0" + nsec;
        var result = new Array();
        result[0] = tmonth[nmonth] + " " + ndate + ", " + nyear;
        result[1] = nhour + ":" + nmin + ":" + nsec;
        return result;
      },

    readUserInfo: function() {
    	var aData = jQuery.ajax({
			type: "GET",
		    contentType: "application/json", 
		    url: "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/user?sap-client=500&sap-language=EN",
		    dataType: "json", 
		/*    success: function(data, textStatus, jqXHR){ 
			
				var result = data[0].model;
				if (result.length > 0) {
					//alert("data found");
					if(result.length === 1) {
						var aUser = [];
						aUser.push(result[0]);
						oModel.setProperty("/userinfo", aUser);
					} 
				} 
			}, */
			success: this.onRequestUserInfoSuccess,
			error: function(json) {   } });
    },
    
    onRequestUserInfoSuccess: function(data) {
    	var result = data[0].model;
		if (result.length > 0) {
			//alert("data found");
			if(result.length === 1) {
				var aUser = [];
				aUser.push(result[0]);
				oModel.setProperty("/userinfo", aUser);
			} 
		}
    },
    
    fillCustomerCombo: function() {
    	var aData = oModel.getProperty("/customers");
    	var curr = this.byId("idCustomerInput");
    	var cmb = this.byId("idCustomerCombo");
    	var eqList = this.byId("idFlexEquipment");
    	
    	if(aData && aData.length > 1) {
    		curr.setVisible(false);
    		cmb.setShowSecondaryValues(true);
    		cmb.setTooltip("Select customer...");
    		cmb.setEditable(true);
    		cmb.removeAllItems();
    		var comboValue = null;
    		
    		aData.sort(function( a, b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);});
    		
    		for(var i = 0; i < aData.length; i++) {
    			var listItem = new sap.ui.core.ListItem();
    			listItem.setText(aData[i].name+" ("+aData[i].city+")");
    			listItem.setTooltip(aData[i].street + ", "+aData[i].house_number+", "+aData[i].city+" (SAP id: "+aData[i].id+")");
    			listItem.setKey(aData[i].id);
    			cmb.addItem(listItem);
    			
    			var custValue = curr.mProperties.value
    			if(aData[i].name.substring(0, custValue.length).toUpperCase() == custValue.toUpperCase() && comboValue == null) {
    				comboValue = aData[i].name;
    				cmb.setValue(comboValue);
    				cmb.setSelectedItem(listItem);
    				this.getEquipmentFromCustomer(cmb.getSelectedKey());
    			}
    		}
    		if(cmb.getValue()=="")
    			cmb.setValue(aData[0].name);
    		
    		cmb.setVisible(true);
    		eqList.setVisible(true);
    	} else if(aData && aData.length == 1) {
    		curr.setVisible(true);
    		cmb.setVisible(false);
    	}    		
    },

    getEquipmentFromCustomer: function(id) {
    	var aIds = [];
    	
    	aIds.push(id);
    	
    	var j = {
				'ids': aIds,
				'READ_EQUIPMENTS': "TRUE"
		}
		
		var aData = jQuery.ajax({
			type: "GET",
		    contentType: "application/json", 
		    url: "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN",
			data: {"json": JSON.stringify(j), "action": "get_all_in_range"},
		    dataType: "json", 
		    success: function(data, textStatus, jqXHR){ 
			
				var result = data[0].model;
				if (result.length > 0) {
					oModel.setProperty("/equipmentList", result[0].equipments);
				} else {
					oModel.setProperty("/equipmentList", null);
				};
			},  
			error: function(json) {  alert("fail to post"); } });
		
		var eqModel = this.getView().getModel("dataModel");
		if(eqModel) {
			eqModel.updateBindings(true);
		}
    	
    },
    
    selectSerialNr: function(t) {
    	var sernr = this.byId("idSerialNr");
    	if(t.oSource.mProperties["text"]) {
    		var sn = t.oSource.mProperties["text"];
    		sn=sn.toUpperCase();
    		
    		sernr.setValue(sn);
    		
    		this.serialChange(t);
    	}
    },
    
    checkInEquipment: function() {
    	var cmbFlow = this.byId("idCmbFlow");
    	var btnCheckin = this.byId("idBtnCheckin");
    	
    	var eqState = oModel.getProperty("/equipment/checked_in");
    	if(!eqState || eqState=="" || eqState=="Unknown" || eqState=="Checked-Out") {
    		oModel.setProperty("/equipment/checked_in","Checked-In");
    		if(cmbFlow.getValue()=="") {
    			cmbFlow.setValueState("Error");
    			btnCheckin.setEnabled(false);
    		}
    		oModel.setProperty("/checkinButton", "Start Service Repair");
    	}
    	if(eqState=="Checked-In") {
    		oModel.setProperty("/equipment/checked_in","In Service");
    		oModel.setProperty("/checkinButton", "Ready for Shipment");
    	}
    	if(eqState=="In Service") {
    		oModel.setProperty("/equipment/checked_in","Ready for Shipment");
    		oModel.setProperty("/checkinButton", "Check out");
    	}
    	if(eqState=="Ready for Shipment") {
    		oModel.setProperty("/equipment/checked_in","Checked-Out");
    		oModel.setProperty("/checkinButton", "Check in");
    	}
    },
    
    flowDropDownChange: function() {
    	var cmbFlow = this.byId("idCmbFlow");
    	var btnCheckin = this.byId("idBtnCheckin");
    	var inPrice = this.byId("idFixedPriceValue");
    	var eqState = oModel.getProperty("/equipment/checked_in");
    	
    	if(cmbFlow.getValue()==""&&eqState=="Checked-In") {
    		cmbFlow.setValueState("Warning");
    		btnCheckin.setEnabled(false);
    	}
    	else {
    		cmbFlow.setValueState("None");
    		if(cmbFlow.getSelectedKey()=="FP") {
    			inPrice.setVisible(true);
    			if(this.isNumeric(inPrice.mProperties.value)&&inPrice.mProperties.value > 0)
    				btnCheckin.setEnabled(true);
    			else
    				btnCheckin.setEnabled(false);
    		}
    		else {
    			inPrice.setVisible(false);
    			btnCheckin.setEnabled(true);
    		}
    	}
    },
    
    inputFPPriceChange: function(t) {
		var btn = this.byId("idBtnCheckin");
		var inp = this.byId("idFixedPriceValue");
		var value = t.mParameters.value;
		var eqState = oModel.getProperty("/equipment/checked_in");
		
		if(eqState && eqState == "Checked-In") {
			if(this.isNumeric(value) && value > 0) {
				inp.setValueState("None");
				btn.setEnabled(true);
			}
			else {
				inp.setValueState("Error");
				btn.setEnabled(false);
				
			}
		}
		
	}
});