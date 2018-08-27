sap.ui.controller("views.App", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf pts.workshop.App
*/
	onInit: function() {
        
        this.readUserInfo();

        //Read cookie info
        var emailCookie = jQuery.sap.storage.get("email");
        if(emailCookie) {
        	oModel.setProperty("/mailto", emailCookie);
        }

        //Set Initial focus
        var oSNInput = this.getView().byId("idSerialNr");
        this.setInitialFocus(oSNInput);
        
        var equipment = {
        		
        }
        var initialMaterial = {
        		"id": ""
        }
        
        //Initialize data model
        oModel.setProperty("/equipmentfound", false);
		oModel.setProperty("/equipment/checked_in",false);
		oModel.setProperty("/equipmentWorkshopList", null);
		oModel.setProperty("/materialList", null);
		oModel.setProperty("/selectmaterial",false);
		oModel.setProperty("/entermaterial",true);
		oModel.setProperty("/material", initialMaterial);
		
		//Add an AfterRendering on Comboboxes to set default values
		var cmbNewMaterialNr = this.byId("idNewMaterialNrCombo");
		var equipDescription = this.byId("idNewEquipDescr");
		cmbNewMaterialNr.onAfterRendering = function () {
			var materialList = oModel.getProperty("/materialList");
			var equip = oModel.getProperty("/equipment");
			if(materialList && materialList.length > 1) {
				var selectedKey = materialList[0].id;
				if(selectedKey) {
					cmbNewMaterialNr.setSelectedKey(selectedKey);
					if(equip && equip.description =="") {
						oModel.setProperty("/equipment/description", materialList[0].description); 
					}
				}
			}
		}
		
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
	onExit: function() {

        //Read cookie info
		var email = oModel.getProperty("/mailto");
		jQuery.sap.storage.put("email", email);

		
	},
	
	setInitialFocus: function(control) { 
		  this.getView().addEventDelegate({
		    onAfterShow: function() {
		      setTimeout(function() {
		        control.focus();
		      }.bind(this), 0);
		    },
		  }, this);
	},
	
	serialChange: function(t) {
		var custumerInput = this.byId("idCustomerInput");
    	var customerCombo = this.byId("idCustomerCombo");
    	var mainPage = this.byId("mainPage");
    	var eqList = this.byId("idFlexEquipment");
    	var eqState = this.byId("idCurrentState");
    	var warrState = this.byId("idEquipWarr");
    	var arrDateTime = this.byId("dtpArrivalDateTime");
    	var ser = this.byId("idSerialNr");
    	var flowIconTabItem = this.byId("idServiceFlow");
    	var subIconBar = this.byId("idSubIconBar");
    	var checkInButton = this.byId("idBtnCheckin");
    	var inputPrice = this.byId("idFixedPriceValue");
    	
    	custumerInput.setVisible(true);
    	customerCombo.setVisible(false);
    	
    	//Clear list of found customers in model as we search now on serial
    	customerCombo.removeAllItems();
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
		var vkorg = oModel.getProperty("/userinfo/default_sales_org");
		
		var j = {
				'serial_number' : sernr,
				'sales_org': vkorg
		}
		
	//	var j = { 'rsparms_tt':
	//				[{'SELNAME': 'SERNR', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': sernr},
	//					{'SELNAME': 'VKORG', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': vkorg}]
	//	}
		
		var locationHostName = window.location.hostname;
		var strUrl;
		if(locationHostName.toLowerCase()=="localhost") {
			//AS1 = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
			//AD1 = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
		} else {
			strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
		}
		
		if(sernr.length > 5) {
			var aData = jQuery.ajax({
				type: "GET",
			    contentType: "application/json", 
			    url: strUrl,
				data: {"json": JSON.stringify(j), "action": "get_by_serial"},
		//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
			    dataType: "json", 
			    success: function(data, textStatus, jqXHR){ 
				
					var result = data[0].model;
					//Test if data has been found
					if (result.length > 0) {
						
						//If the result contains 1 data set, then 1 equipment is found and can be displayed
						if(result.length === 1) {
							aEquipment = [];
							
							//check if warranty is filled and valid.
							if(result[0].vendor_warranty_end && result[0].vendor_warranty_end.length == 8) {
								var sYYYYMMDD = result[0].vendor_warranty_end.toString();
								var sYYYY = sYYYYMMDD.substring(0, 4);
								var sMM = sYYYYMMDD.substring(4, 6);
								var sDD = sYYYYMMDD.substring(6, 8);
								var warrDate = new Date(sYYYY+"-"+sMM+"-"+sDD+"Z");
								result[0].vendor_warranty_end = warrDate;
								
							} else {
								oModel.setProperty("/equipment/warranty_end", "");
								oModel.setProperty("/equipment/warranty_valid", false);
							}
							aEquipment.push(result[0]);
							
							oModel.setProperty("/equipment", aEquipment[0]);
							oModel.setProperty("/equipment/serial_number_id", result[0].serial_number+" (SAP id: "+result[0].id+")");
							
							//check if warranty is passed or not
							if(aEquipment[0].vendor_warranty_end) {
								var warrDate = aEquipment[0].vendor_warranty_end;
								oModel.setProperty("/equipment/vendor_warranty_end", warrDate.toLocaleDateString());	
								var today = new Date();
								if(warrDate >= today) {	
									oModel.setProperty("/equipment/warranty_valid", true);
									warrState.addStyleClass("InfoStateGreen");
								} else {
									oModel.setProperty("/equipment/warranty_valid", false);
									warrState.addStyleClass("InfoStateRed");
								}
							} else {
								oModel.setProperty("/equipment/vendor_warranty_end", "Unknown");
								oModel.setProperty("/equipment/warranty_valid", false);
								warrState.addStyleClass("InfoStateRed");
							}
							//check status of equipment
							if(result[0].user_status && result[0].user_status.indexOf("ZCHI")!==-1) {
								oModel.setProperty("/equipment/checked_in","Checked-In");
								oModel.setProperty("/checkinButton", "Start Service Repair");
								checkInButton.setEnabled(false);
								inputPrice.setEnabled(true);
								eqState.addStyleClass("InfoStateRed");
							} else if(result[0].user_status && result[0].user_status.indexOf("ZCHO")!==-1) {
								oModel.setProperty("/equipment/checked_in","Checked-Out");
								oModel.setProperty("/checkinButton", "Check in");
								eqState.addStyleClass("InfoStateGreen");
								arrDateTime.setEnabled(true);
							} else if(result[0].user_status && result[0].user_status.indexOf("ZRFS")!==-1) {
								oModel.setProperty("/equipment/checked_in","Ready for Shipment");
								oModel.setProperty("/checkinButton", "Check out");
								eqState.addStyleClass("InfoStateGreen");
							}
							else {
								oModel.setProperty("/equipment/checked_in","Unknown");
								oModel.setProperty("/checkinButton", "Check in");
								arrDateTime.setEnabled(true);
								eqState.addStyleClass("InfoStateGreen");
							}
							
							oModel.setProperty("/equipmentfound", true);
							subIconBar.setSelectedKey(flowIconTabItem.sId);
							custumerInput.setEnabled(false);
							mainPage.setShowFooter(true);
						} 
					
					//If no data is found, reset content of other fields, areas...	
					} else {
						oModel.setProperty("/equipmentfound", false);
						custumerInput.setEnabled(true);
						//flowIconTabItem.setVisible(false);
						mainPage.setShowFooter(false);
					} 
				},  
				error: function(json) { } });
		} else {
			custumerInput.setEnabled(true);
			oModel.setProperty("/equipmentfound", false);
			//flowIconTabItem.setVisible(false);
			mainPage.setShowFooter(false);
		}
	},
	
	customerInputChange: function(t) {
		var custn = t.mParameters.value;
		
		//If we are in new equipment creation pop-up, then we need variable newEquipPopup to be set to true
		var idNewEquipCustInput = this.byId("idNewCustomerInput");
		var newEquipPopup = false;
		if (t.mParameters.id == idNewEquipCustInput.sId)
			newEquipPopup = true;
		
		var userinfo = oModel.getProperty("/userinfo");
		var salesorg = userinfo.default_sales_org;
		var division = userinfo.default_division;
		var customersFound = 0;
		var aCustomers = oModel.getProperty("/customers");
		if(aCustomers && aCustomers.length > 0) 
			customersFound = aCustomers.length;
		
		var aEquipment = oModel.getProperty("/equipment");
		aEquipment = [];
		
		oModel.setProperty("/equipmentfound", false);
		
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
			aAccountGrps.push("Z002");  //Read only Installed-At and Ship-to customers
			
			if(custn.length >= 4) {		//Start searching if user enter 4 or more characters
				var j = {
						'name': custn,
						'country': salesorg.substring(0,2),
						'sales_org': salesorg,
						'distr_chn': '01',
						'division': division,
						'account_grps':  aAccountGrps
				}
				
				var locationHostName = window.location.hostname;
				var strUrl;
				if(locationHostName.toLowerCase()=="localhost") {
					// AS1 "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
					// AD1 "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
					strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
				} else {
					strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
				}
				
				//Call Backend system to request customers with parameters as specified in JSON structure
				var aData = jQuery.ajax({
					type: "GET",
				    contentType: "application/json", 
				    url: strUrl,
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
		//this.getView().setModel(oModel,"dataModel");
		
		//Load the customers found in the Combo to allow user to select correct customer
		//Use variable newEquipPopup to decide if list needs to be shown in pop-up or not
		this.fillCustomerCombo(newEquipPopup);
		
	},
	
	customerDropDownChange: function(t) {
		
		//If we are in new equipment creation pop-up, then we need variable newEquipPopup to be set to true
		var idNewEquipCustCombo = this.byId("idNewCustomerCombo");
		var newEquipPopup = false;
		if (t.mParameters.id == idNewEquipCustCombo.sId)
			newEquipPopup = true;
		
		var customerInput = null;
		var customerCombo = null;
		if(newEquipPopup) {
			customerInput = this.byId("idNewCustomerInput");
			customerCombo = this.byId("idNewCustomerCombo");
			var custId = this.byId("idNewCustId");
			custId.setTitle("ID: " + customerCombo.getSelectedKey());
			
		} else {
			customerInput = this.byId("idCustomerInput");
			customerCombo = this.byId("idCustomerCombo");
		}
		var iconBar = this.byId("idSubIconBar");
		var equipmentFound = 0;
		
		if(customerCombo.getValue()=="") {
			customerInput.mProperties.value = "";
			aCustomers = [];
			oModel.setProperty("/customers",aCustomers);
			customerInput.setVisible(true);
			customerCombo.setVisible(false);
			iconBar.setVisible(false);
		} else {
			oModel.setProperty("/equipmentfound",false);
			oModel.setProperty("/equipmentList",null);
			iconBar.setVisible(true);
			this.getEquipmentFromCustomer(customerCombo.getSelectedKey());
			
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
    	
    	var locationHostName = window.location.hostname;
    	var userInfoCombo = this.byId("idCmbUserInfo");
		var strUrl;
		if(locationHostName.toLowerCase()=="localhost") {
			//AS1 "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/user?sap-client=500&sap-language=EN";
			//AD1 "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/user?sap-client=510&sap-language=EN";
			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/user?sap-client=510&sap-language=EN";
		} else {
			strUrl = "/sap/zrest/stc/user?sap-client=500&sap-language=EN";
		}
    	
    	var aData = jQuery.ajax({
			type: "GET",
		    contentType: "application/json", 
		    url: strUrl,
		    dataType: "json", 
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
				oModel.setProperty("/userinfo", aUser[0]);
			} 
		}		
    },
    
    onRequestMaterialSuccess: function(data) {
    	//var materialInput = this.byId("idNewMaterialNr");
    	var result = data[0].model;
    	if(result.length > 1) {
    		oModel.setProperty("/selectmaterial", true);
    		oModel.setProperty("/entermaterial", false);
    		oModel.setProperty("/materialList", result);
    		oModel.setProperty("/material", result[0]);
    	} else {
    		oModel.setProperty("/selectmaterial", false);
    		oModel.setProperty("/entermaterial", true);
    		oModel.setProperty("/materialList", null);
    		if(result && result.length==1) {
    			oModel.setProperty("/material", result[0]);
    		}
    	}
    },
    
    fillCustomerCombo: function(usePopup) {
    	var aData = oModel.getProperty("/customers");
    	var customerInput = null;
    	
    	//If the input is via Popup, then data needs to be loaded in Popup.
    	if(usePopup) {
    		customerInput = this.byId("idNewCustomerInput");
    		customerCombo = this.byId("idNewCustomerCombo");
    	} else {
    		customerInput = this.byId("idCustomerInput");
    		customerCombo = this.byId("idCustomerCombo");
    	}
    	var eqList = this.byId("idFlexEquipment");
    	var equipListIconTabItem = this.byId("idEquipmentList");
    	var iconBar = this.byId("idSubIconBar");
    	
    	if(aData && aData.length > 1) {
    		customerInput.setVisible(false);
    		customerCombo.setShowSecondaryValues(true);
    		customerCombo.setTooltip("Select customer...");
    		customerCombo.setEditable(true);
    		customerCombo.removeAllItems();
    		var comboValue = null;
    		
    		if(!usePopup)
    			iconBar.setVisible(true);
    		
    		aData.sort(function( a, b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);});
    		
    		for(var i = 0; i < aData.length; i++) {
    			var listItem = new sap.ui.core.ListItem();
    			listItem.setText(aData[i].name+" ("+aData[i].city+")");
    			listItem.setTooltip(aData[i].street + ", "+aData[i].house_number+", "+aData[i].city+" (SAP id: "+aData[i].id+")");
    			listItem.setKey(aData[i].id);
    			customerCombo.addItem(listItem);
    			
    			var custValue = customerInput.mProperties.value
    			if(aData[i].name.substring(0, custValue.length).toUpperCase() == custValue.toUpperCase() && comboValue == null) {
    				comboValue = aData[i].name;
    				customerCombo.setValue(comboValue);
    				customerCombo.setSelectedItem(listItem);
    				this.getEquipmentFromCustomer(customerCombo.getSelectedKey());
    			}
    		}
    		if(customerCombo.getValue()=="")
    			customerCombo.setValue(aData[0].name);
    		
    		iconBar.setSelectedKey(equipListIconTabItem.sId);
    		customerCombo.setVisible(true);
    		
    		if(usePopup) {
    			var custId = this.byId("idNewCustId");
    			custId.setTitle("ID: " + customerCombo.getSelectedKey());
    		}
    		
    		if(!usePopup)
    			eqList.setVisible(true);
    	} else if(aData && aData.length == 1) {
    			customerInput.setVisible(true);
    			customerCombo.setVisible(false);
    			if(!usePopup)
    				iconBar.setVisible(true);
    		}  else {
    			iconBar.setVisible(false);
    		}  		
    },

    getEquipmentFromCustomer: function(id) {
    	var aIds = [];
    	var subIconBar = this.byId("idSubIconBar");
    	var equipListIconTabItem = this.byId("idEquipmentList");
    	var flowIconTabItem = this.byId("idServiceFlow");
    	var eqFlexList = this.byId("idFlexEquipment");
    	
    	var eqFound = oModel.getProperty("/equipmentfound");
    	var eqList = oModel.getProperty("/equipmentList");
    	
    	if(eqFound == true && eqList != null && eqList.length > 0) {
    		subIconBar.setSelectedKey(flowIconTabItem.sId);
    	} else {
    		subIconBar.setSelectedKey(equipListIconTabItem.sId);
    	}
    	
    	aIds.push(id);
    	
    	var j = {
				'ids': aIds,
				'READ_EQUIPMENTS': "TRUE",
				'READ_CONTACTS': "TRUE"
		}
    	
    	var locationHostName = window.location.hostname;
		var strUrl;
		if(locationHostName.toLowerCase()=="localhost") {
			//AS1 "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
			//AD1 "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
		} else {
			strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
		}
		
		var aData = jQuery.ajax({
			type: "GET",
		    contentType: "application/json", 
		    url: strUrl,
			data: {"json": JSON.stringify(j), "action": "get_all_in_range"},
		    dataType: "json", 
		    success: function(data, textStatus, jqXHR){ 
			
				var result = data[0].model;
				if (result.length > 0 && result[0].equipments) {
					if(result[0].equipments[0].sales_organization)
						oModel.setProperty("/userinfo/default_sales_org", result[0].equipments[0].sales_organization);
					oModel.setProperty("/equipmentList", result[0].equipments);
					eqFlexList.setVisible(true);
					if(result[0].contacts && result[0].contacts.length > 0) {
						oModel.setProperty("/customercontacts", result[0].contacts)
					}
					else {
						oModel.setProperty("/customercontacts", null);
					}
				} else {
					oModel.setProperty("/equipmentList", null);
					oModel.setProperty("/customercontacts", null);
					eqFlexList.setVisible(false);
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
    
    checkInEquipment: function(t) {
    	var inpFPPrice = this.byId("idFixedPriceValue");
    	var btnCheckin = this.byId("idBtnCheckin");
    	var arrDateTime = this.byId("dtpArrivalDateTime");
    	var notifText = this.byId("idNotifText");
    	var postdata = null;
    	var userStatuses = [];
    	var text = "";
    	
    	inpFPPrice.setEnabled(false);
    	var value = 0;
    	if(inpFPPrice.mProperties.value) 
    		value = inpFPPrice.mProperties.value;
    	
    	var equipment = oModel.getProperty("/equipment");

    	if(t.oSource.mProperties.text == "Start Service Repair") {
    		if(value > 0) {
    			var userinfo = oModel.getProperty("/userinfo");
    			var service_order_hd = [];
    			var service_order_par = [];
    			var service_order_nts = [];
    			if(arrDateTime.mProperties.value)
    				text = "Arrival date/time: " + arrDateTime.mProperties.value;
    			
    			if(notifText.mProperties.value)
    				text += notifText.mProperties.value;
    			
    			var d = new Date();
    			var createdDate = d.toISOString().slice(0,10);
    			createdDate = createdDate.replace(/-/g,"");
    			var createdOn = d.toLocaleTimeString().slice(0,8);
    			createdOn = createdOn.replace(/:/g,"");
    			
    			service_order_hd.push({
    					'ilart': 'FP',
    					'equnr': equipment.id,
    					'created_by': userinfo.name,
    					'created_date': createdDate,
    					'created_on': createdOn,
    					'vkorg': equipment.sales_organization,
    					'vtweg': equipment.distribution_channel,
    					'spart': equipment.division,
    					'serv_ord_text': 'Workshop repair',
    					'notification_descr': 'Workshop repair',
    					'notification_type': 'Y1',
    					'selling_value': value,
    			});
    			
    			service_order_par.push({
    				'parvw': 'SP',
    				'kunn2': equipment.sold_to,
    				'created_by': userinfo.name,
    				'created_date': createdDate
    			});
    			
    			service_order_par.push({
    				'parvw': 'ZI',
    				'kunn2': equipment.installed_at,
    				'created_by': userinfo.name,
    				'created_date': createdDate
    			});
    			
    			service_order_nts.push({
    				'tdobject': 'QMEL',
    				'tdid': 'LTXT',
    				'langu': 'EN',
    				'text': text
    			});
    			
    			var postdata = {
    					'ZSTC_TAB_SRVFLOW_HD': service_order_hd,
    					'ZSTC_TAB_SRVFLOW_PAR': service_order_par,
    					'ZSTC_TAB_SRVFLOW_NTS': service_order_nts
    			};
    			
    			var locationHostName = window.location.hostname;
        		var strUrl;
        		if(locationHostName.toLowerCase()=="localhost") {
        			//AS1 = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
        			//AD1 = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
        			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/serviceflow?sap-client=510&sap-language=EN";
        		} else {
        			strUrl = "/sap/zrest/stc/serviceflow?sap-client=500&sap-language=EN";
        		}
        		var aData = jQuery.ajax({
    				type: "POST",
    			    contentType: "application/json", 
    			    url: strUrl,
    				data: {"json": JSON.stringify(postdata), "action": "create"},
    		//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
    			    dataType: "json", 
    			    success: function(data, textStatus, jqXHR){    		}
        		});
    		}
    	}  //End if Start Service Repair
    	
    	var eqState = oModel.getProperty("/equipment/checked_in");
    	if(!eqState || eqState=="" || eqState=="Unknown" || eqState=="Checked-Out") {
    		oModel.setProperty("/equipment/checked_in","Checked-In");
    		inpFPPrice.setEnabled(true);
    		if(value <= 0) {
    			inpFPPrice.setValueState("Error");
    			btnCheckin.setEnabled(false);
    		} else {
    			btnCheckin.setEnabled(true);
    		}
    		userStatuses.push({'USER_STATUS_CODE':'ZCHI','INACT': ''});
    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': 'X'});
    		postdata = {
    				'equnr': equipment.id,
    				'user_status_changes': userStatuses
    		};
    		
    		oModel.setProperty("/checkinButton", "Start Service Repair");
    	}
    	if(eqState=="Checked-In") {
    		oModel.setProperty("/equipment/checked_in","In Service");
    		oModel.setProperty("/checkinButton", "Ready for Shipment");
    	}
    	if(eqState=="In Service") {
    		oModel.setProperty("/equipment/checked_in","Ready for Shipment");
    		oModel.setProperty("/checkinButton", "Check out");
    		
    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': ''});
    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': 'X'});
    		postdata = {
    				'equnr': equipment.id,
    				'user_status_changes': userStatuses
    		};
    	}
    	if(eqState=="Ready for Shipment") {
    		oModel.setProperty("/equipment/checked_in","Checked-Out");
    		oModel.setProperty("/checkinButton", "Check in");
    		arrDateTime.setEnabled(true);
    		
    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': ''});
    		userStatuses.push({'USER_STATUS_CODE':'ZCHI','INACT': 'X'});
    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': 'X'});
    		postdata = {
    				'equnr': equipment.id,
    				'user_status_changes': userStatuses
    		};
    	}
    	if(postdata) {
    		var locationHostName = window.location.hostname;
    		var strUrl;
    		if(locationHostName.toLowerCase()=="localhost") {
    			//AS1 = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
    			//AD1 = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
    			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
    		} else {
    			strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
    		}
    		var aData = jQuery.ajax({
				type: "GET",
			    contentType: "application/json", 
			    url: strUrl,
				data: {"json": JSON.stringify(postdata), "action": "update"},
		//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
			    dataType: "json", 
			    success: function(data, textStatus, jqXHR){
					var result = data[0].model;
					//Result must have only 1 equipment, check status of equipment
					if(result[0].user_status && result[0].user_status.indexOf("ZCHI")!==-1) {
						oModel.setProperty("/equipment/checked_in","Checked-In");
						oModel.setProperty("/checkinButton", "Start Service Repair");
						eqState.addStyleClass("InfoStateRed");
					} else if(result[0].user_status && result[0].user_status.indexOf("ZCHO")!==-1) {
						oModel.setProperty("/equipment/checked_in","Checked-Out");
						oModel.setProperty("/checkinButton", "Check in");
						eqState.addStyleClass("InfoStateGreen");
						arrDateTime.setEnabled(true);
					} else if(result[0].user_status && result[0].user_status.indexOf("ZRFS")!==-1) {
						oModel.setProperty("/equipment/checked_in","Ready for Shipment");
						oModel.setProperty("/checkinButton", "Check out");
						eqState.addStyleClass("InfoStateGreen");
					}
					else {
						oModel.setProperty("/equipment/checked_in","Unknown");
						oModel.setProperty("/checkinButton", "Check in");
						arrDateTime.setEnabled(true);
						eqState.addStyleClass("InfoStateGreen");
					}
				 },
				error: function() {}
    		});
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
		
	},
	
	inputMailChange: function(t) {
		var idSendMailTo = this.byId("idSendMailTo");
		var mailString = t.mParameters.value;
		
		if(this.validateEmail(mailString)) {
			idSendMailTo.setValueState("None");
		} else {
			idSendMailTo.setValueState("Error");
		}
		
	},
	
	validateEmail:function(email) {
	    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	    return re.test(String(email).toLowerCase());
	},
	
	onSubIconBarSelect: function(t) {
		var equipFound = oModel.getProperty("/equipmentfound");
		var equipListIconTabItem = this.byId("idEquipmentList");
		
		if(equipFound == true && t.mParameters.selectedKey == equipListIconTabItem.sId) {
			var equipList = oModel.getProperty("/equipmentList")
			if(equipList == null || equipList.length == 0) {
				var equip = oModel.getProperty("/equipment");
				this.getEquipmentFromCustomer(equip.installed_at);
			}
		}
	},
	
	OnShowUserInfo: function(oEvent) {
		if(!this._oDialog) {
			this._oDialog = sap.ui.xmlfragment("fragments.userInfo");
			this._oDialog.setModel(oModel);
			this._oDialog.setBindingContext(new sap.ui.model.Context(oModel, "/userinfo"));
		}
			
		// Multi-select if required
		var bMultiSelect = !!oEvent.getSource().data("multi");
		this._oDialog.setMultiSelect(bMultiSelect);

		// Remember selections if required
		var bRemember = !!oEvent.getSource().data("remember");
		this._oDialog.setRememberSelections(bRemember);

		// clear the old search filter
		this._oDialog.getBinding("items").filter([]);

		// toggle compact style
		jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
		this._oDialog.open();
	},
	
	onAddEquipment: function(oEvent) {
		var oView = this.getView();
		var oDialog = oView.byId("addEquipmentDialog");
		
		if (!oDialog) {
			// create dialog via fragment factory
			oDialog = sap.ui.xmlfragment(oView.getId(), "fragments.addEquipment");
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
		}

		oDialog.open();
	},
	
	onCancelEquipCreate: function(oEvent) {
		var oView = this.getView();
		var oDialog = oView.byId("addEquipmentDialog");
		
		if (oDialog) {
			oDialog.close();
		}
	},
	
	onMaterialChange: function(oEvent) {
		var locationHostName = window.location.hostname;
		
    	var materialnr = null;
    	var idInputMaterial = this.byId("idNewMaterialNr");
    	var idComboMaterial = this.byId("idNewMaterialNrCombo");
    	if(oEvent.mParameters.id == idInputMaterial.sId) {
    		materialnr = oEvent.mParameters.value;
    		oModel.setProperty("/material/id", materialnr);
    	} else {
    		materialnr = idComboMaterial.getSelectedKey();
    		var matList = oModel.getProperty("/materialList");
    		var index = $.inArray(materialnr, $.map(matList, function(n){
    		    return n.id;
    		}));
    		if(index>=0) {
    			oModel.setProperty("/material", matList[index]);
    		}
    	}
    	
		var strUrl;
		var userinfo = oModel.getProperty("/userinfo");
		var salesorg = userinfo.default_sales_org;
		var division = userinfo.default_division;
		
		var j = { 'rsparms_tt':
			[{'SELNAME': 'VKORG', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': salesorg},
				{'SELNAME': 'MATNR', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': materialnr}]
		}
		
		if(materialnr.length>=4) {
		
			if(locationHostName.toLowerCase()=="localhost") {
				//AS1 "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/material?sap-client=500&sap-language=EN";
				//AD1 "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/material?sap-client=510&sap-language=EN";
				strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/material?sap-client=510&sap-language=EN";
			} else {
				strUrl = "/sap/zrest/stc/material?sap-client=500&sap-language=EN";
			}
    	
			var aData = jQuery.ajax({
				type: "GET",
				    contentType: "application/json", 
		    	url: strUrl,
				data: {"json": JSON.stringify(j), "action": "query_material"},
		    	dataType: "json", 
				success: this.onRequestMaterialSuccess,
				error: function(json) {   } });
		}
	},
	
	onSelectWorkshopList: function(oEvent) {
		var idSelectWorkshopList = this.byId("idEquipInWorkshop").sId;
		var vkorg = oModel.getProperty("/userinfo/default_sales_org");
		
		if(oEvent.mParameters.selectedKey == idSelectWorkshopList) {

			var j = { 'rsparms_tt':
						[{'SELNAME': 'EQART', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'EQUIPMENT'},
							{'SELNAME': 'STAT', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'ZCHIN'},
							{'SELNAME': 'STAT', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'ZRFS'},
							{'SELNAME': 'VKORG', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': vkorg}]
			}
				
				var locationHostName = window.location.hostname;
				var strUrl;
				if(locationHostName.toLowerCase()=="localhost") {
					//AS1 "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
					//AD1 "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
					strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
				} else {
					strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
				}
				
				var aData = jQuery.ajax({
					type: "GET",
				    contentType: "application/json", 
				    url: strUrl,
						data: {"json": JSON.stringify(j), "action": "query_equipment"},
					    dataType: "json", 
					    success: function(data, textStatus, jqXHR){ 
						
						var result = data[0].model;
						//Test if data has been found
						if (result.length > 0) {
								
								//If the result contains 1 data set, then 1 equipment is found and can be displayed
								if(result.length === 1) {
									aEquipment = [];
									
									aEquipment.push(result[0]);
									
									oModel.setProperty("/equipmentWorkshopList", aEquipment[0]);
									
								} 
							
							//If no data is found, reset content of other fields, areas...	
							} else {
								oModel.setProperty("/equipmentWorkshopList", null);
							} 
						},  
						error: function(json) {  alert("fail to post"); } });
		}
		
	}
});