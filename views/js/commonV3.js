// COMMANDS
let CMD_GET_LCD_DATA = 11 // Get LCD DATA
let CMD_SET_LCD_DATA = 12 // Set LCD DATA
let CMD_RET_LCD_DATA = 13 // Return LCD DATA
let CMD_GET_MAP_DATA = 21 // Get MAP DATA
let CMD_SET_MAP_DATA = 22 // Set MAP DATA
let CMD_RET_MAP_DATA = 23 // Return MAP DATA
let CMD_GET_WIFI_STATUS = 31 // Get WIFI STATUS
let CMD_SET_WIFI_STATUS = 32 // Set WIFI STATUS
let CMD_RET_WIFI_STATUS = 33 // Return WIFI STATUS
let CMD_GET_WIFI_CONFIG = 41 // Get WIFI CONFIG
let CMD_SET_WIFI_CONFIG = 42 // Set WIFI CONFIG
let CMD_RET_WIFI_CONFIG = 43 // Return WIFI CONFIG
let CMD_GET_MPU_STATUS = 51 // Get MPU STATUS
let CMD_SET_MPU_STATUS = 52 // Set MPU STATUS
let CMD_RET_MPU_STATUS = 53 // Return MPU STATUS
let CMD_GET_MPU_CONFIG = 61 // Get MPU CONFIG
let CMD_SET_MPU_CONFIG = 62 // Set MPU CONFIG
let CMD_RET_MPU_CONFIG = 63 // Return MPU CONFIG
let CMD_RET_LOG = 91 // Return LOG
let CMD_RET_STATUS = 92 // Return STATUS

// MODULE_TYPE: 1=OFF, 2=GH, 3=BAYWater, 4=BAYMap
let OFFICE_MODULE_TYPE = 1
let GREENHOUSE_MODULE_TYPE = 2
let BAYWATER_MODULE_TYPE = 3
let BAYMAP_MODULE_TYPE = 4

// FLAGS for WATER and MAP icons in LOCATION CONTAINER
let mapIconFLAG = false;
let waterIconFLAG = false;

// Set color variables for FONT colors
let colorDEFAULT = 0; // DEFAULT font color is BLACK
let colorERROR   = 1; // ERROR   font color is RED
let colorSUCCESS = 2; // SUCCESS font color is GREEN
let colorINFO    = 3; // INFOR   font color is BLUE

$(document).ready(() => {

    let wifiClient = '';
    let socket = io.connect('/', {
      transports: ['websocket'],
      upgrade: false,
      rejectUnauthorized: false,
      secure: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 10
    });

    let officeName = $(".office-div > h3").html();

    socket.on('WIFI-CLIENT-CONNECTED', (data) => {
      if (data.socketId) {
        wifiClient = data.socketId;
        appendLogs(`WIFI Client ${data.socketId} connected.`, colorSUCCESS);
      } else {
        appendLogs(`Not WIFI Client available yet.`, colorERROR);
      }
    });
    socket.on('WIFI-CLIENT-DISCONNECTED', (data) => {
      wifiClient = '';
      appendLogs(`WIFI Client ${data.socketId} disconnected.`, colorINFO);
    });

    socket.on('message', (data) => {
      appendLogs(`Message received from WIFI Client ${JSON.stringify(data.msg, null, 2)}.`, colorINFO);
    });

    socket.on('fromiot', (responseFromIOT) => {
      processTheIOTResponse(responseFromIOT);
    });

    socket.emit('join', {
      type: 'WEB'
    });

    // structure to IOT
    let objectToIOT = {
      office_name: '',     // OFFICE_NAME
      greenHouse_name: '', // GREENHOUSE_NAME
      bay_name: '',        // BAY_NAME
      targetType: '',     // MODULE_TYPE: 1=OFF, 2=GH, 3=BAYWater, 4=BAYMap
      command: '',        // COMMAND
      data: ''            // DATA: KEYPAD input
    };

    // structure from IOT
    let objectFromIOT = {
      command: '', // COMMAND
      data1: '',   // LCD, MAP, MPU, WiFi, LOG return data LINE1
      data2: '',   // LCD, MAP, MPU, WiFi, LOG return data LINE2
      data3: '',   // LCD, MAP, MPU, WiFi, LOG return data LINE3
      data4: ''    // LCD, MAP, MPU, WiFi, LOG return data LINE4
    };

    // OFFICE GEAR selected (ADMIN mode) 
    $('#all-greenhouses-view').on('click', '.greenhouse-grid .greenhouse-cell-div .gear-div', (element) => {
      // set objectToIOT variables
      // objectToIOT.office_name = document.querySelector('h3.office-title').innerHTML;
      objectToIOT.office_name = officeName;
      objectToIOT.targetType = OFFICE_MODULE_TYPE;
      objectToIOT.greenHouse_name = '';
      objectToIOT.bay_name = 'Bay 1'; // It's default selected
      appendStatus(objectToIOT, colorINFO);
    });
  
    // GREENHOUSE GEAR selected (ADMIN mode)
    $('#all-greenhouses-view').on('click', '.greenhouse-grid .greenhouse-cell-div .gear-div', (element) => {
      // set objectToIOT variables
      // objectForSocket.office_name = document.querySelector('h3.office-title').innerHTML;
      objectToIOT.office_name = officeName;
      objectToIOT.greenHouse_name = element.parentElement.querySelector("h2").innerHTML;
      objectToIOT.targetType = GREENHOUSE_MODULE_TYPE;
      objectToIOT.bay_name = 'Bay 1'; // It's default selected
      appendStatus(objectToIOT, colorINFO);
    });

    // GREENHOUSE selected (USER mode)
    $('#all-greenhouses-view').on('click', '.greenhouse-grid .greenhouse-cell-div .main-greenhouse-div', (element) => {
      // set objectToIOT variables
      // objectToIOT.office_name = document.querySelector('h3.office-title').innerHTML;
      objectToIOT.office_name = officeName;
      objectToIOT.greenHouse_name = element.currentTarget.children[0].innerHTML;
      objectToIOT.targetType = GREENHOUSE_MODULE_TYPE;
      objectToIOT.bay_name = 'Bay 1'; // It's default selected
      // set Selected GH Name in LOCATION
      document.querySelector("#gh-outcome-num").innerHTML = document.querySelector("#greenhouse-1-view > div.bay-info-div > div.bay-heading-div > h1").innerHTML;
      // set Selected BAY Name in LOCATION
      document.querySelector("#bay-outcome-num").innerHTML = document.getElementsByClassName('bay-div selected')[0].innerText;
      // add default WATER icon to BAY LOCATION
      addWaterIcon(objectToIOT);
      appendStatus(objectToIOT, colorINFO);
    });

    // BAY selected
    $('.bay-div').on('click', (element) => {
      // set objectToIOT variables
      objectToIOT.bay_name = element.currentTarget.children[0].innerHTML;
      // set Selected BAY Name in LOCATION
      document.querySelector("#bay-outcome-num").innerHTML = element.currentTarget.children[0].innerHTML;
      appendStatus(objectToIOT, colorINFO);

      if ($(".action-outcome").html() !== ' ') {
        socket.emit('toiot', {
          receiverId: wifiClient,
          senderId: socket.id,
          msg: objectToIOT
        });
      }
    });

    // LOCATION CONTAINER BAY WATER icon selected - toggle to MAP icon
    $('.location-container').on('click', 'bay-icon-container-water', (element) => {
      // add MAP icon to BAY LOCATION
      addMapIcon(objectToIOT);
    });

    // LOCATION CONTAINER BAY MAP icon selected - toggle to WATER icon
    $('.location-container').on('click', 'bay-icon-container-map', (element) => {
      // add WATER icon to BAY LOCATION
      addWaterIcon(objectToIOT);
    });
 
    // Reset/Hide elements when selecting ADMIN->USER mode
    $('.toggle-handle').on('click', '.toggle-div .admin' , (element) => {
      // LOG and STATUS text boxes already hidden when selecting ADMIN->USER
      // document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view").style.display='none';

      // Change ACTION string to '' if ACTION is NOT WATER or MAPPING
      if (($(".action-outcome").html() !== 'Water') && ($(".action-outcome").html() !== 'Mapping')) {
        document.querySelector("#action-outcome").innerHTML='';
      }

      // Hide any action boxes and unselect menu icons and menu text (but not for WATER or MAPPING)
      // ===== WiFi_STATUS
      // Hide WiFi_STATUS action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.wifi-container").style.display='none';
      // Hide WiFi_STATUS menu icon and text
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-wifi > div.operation-icon.wifi").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-wifi > div.home-operation-text").style.color='white';
      
      // ===== WiFI_CONFIG
      // Hide WiFI_CONFIG action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.wifi-config-container").style.display='none';
      // Hide WiFI_CONFIG menu icon and text
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-wifi-config > div.operation-icon.wifi-config").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-wifi-config > div.home-operation-text").style.color='white';
      
      // ===== MPU_STATUS
      // Hide MPU_STATUS action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.mpu-status-container").style.display='none';
      // Hide MPU_STATUS menu icon and text
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-mpu > div.operation-icon.mpu").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-mpu > div.home-operation-text").style.color='white';

      // ===== MPU_CONFIG
      // Hide MPU_CONFIG action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.mpu-config-container").style.display='none';
      // Hide MPU_CONFIG menu icon and text
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-mpu-config > div.operation-icon.mpu-config").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-1-view > div.menu-container > div.admin-menu > div > div.admin-mpu-config > div.home-operation-text").style.color='white';
    });

    // KEYPAD BUTTON selected
    $('.keypad-btn').on('click', (element) => {
      // set objectToIOT variables
      objectToIOT.data = element.currentTarget.children[0].innerHTML;
      objectToIOT.command = CMD_SET_LCD_DATA;
      appendStatus(objectToIOT, colorINFO);
      // Send KEYPAD entry to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // WATER menu button selected
    $('.water').on('click', (element) => {
      objectToIOT.command = CMD_GET_LCD_DATA;
      appendStatus(objectToIOT, colorINFO);
      addWaterIcon(objectToIOT);
      // Send LCD DATA request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // MAPPING menu button selected
    $('.mapping').on('click', (element) => {
      objectToIOT.command = CMD_GET_MAP_DATA;
      appendStatus(objectToIOT, colorINFO);
      addMapIcon(objectToIOT);
      // Send MAP DATA request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // WIFI-STATUS menu button selected
    $('.wifi').on('click', (element) => {
      objectToIOT.command = CMD_GET_WIFI_STATUS;
      appendStatus(objectToIOT, colorINFO);
      // Send WiFi STATUS request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // WIFI-CONFIG menu button selected
    $('.wifi-config').on('click', (element) => {
      objectToIOT.command = CMD_GET_WIFI_CONFIG;
      appendStatus(objectToIOT, colorINFO);
      // Send WiFi CONFIG request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // MPU-STATUS menu button selected
    $('.mpu').on('click', (element) => {
      objectToIOT.command = CMD_GET_MPU_STATUS;
      appendStatus(objectToIOT, colorINFO);
      // Send MPU STATUS request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // MPU-CONFIG menu button selected
    $('.mpu-config').on('click', (element) => {
      objectToIOT.command = CMD_GET_MPU_CONFIG;
      appendStatus(objectToIOT, colorINFO);
      // Send MPU CONFIG request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });
});

// Add WATER ICON before BAY location text
function addWaterIcon(objectToIOT) {
    // If MAP ICON is up, remove it
    if (mapIconFLAG == true) {
        document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > div:nth-child(1)").remove();
        mapIconFLAG = false;
    }
    // If WATER ICON is NOT up, add it
    if (waterIconFLAG == false) {
        var el = document.createElement("div");
        el.className = "bay-icon-container-water";
        document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2").innerHTML="BAY WATER: ";
        $(document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2")).before(el);
        waterIconFLAG = true;
    }
    // Set TARGETTYPE to BAYWATER
    objectToIOT.targetType = BAYWATER_MODULE_TYPE;
}

// Add MAP ICON before BAY location text
function addMapIcon(objectToIOT) {
    // If WATER ICON is up, remove it
    if (waterIconFLAG == true) {
        document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > div:nth-child(1)").remove();
        waterIconFLAG = false;
    }
    // If MAP ICON is NOT up, add it
    if (mapIconFLAG == false) {
        var el = document.createElement("div");
        el.className = "bay-icon-container-map success";
        document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2").innerHTML="BAY MAP: ";
        $(document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2")).before(el);
        mapIconFLAG = true;
    }
    // Set TARGETTYPE to BAYMAP
    objectToIOT.targetType = BAYMAP_MODULE_TYPE;
}

// Print colored "msg" to LOG text box
function appendLogs(msg, color) {
    console.table('appendLogs', msg);

    if ($('.log-div').length) {
        $('.log-div').append(`<div class='log-text-content'>${JSON.stringify(msg)}</div>`);
        // IF USER MODE
        if (document.getElementsByClassName('admin').length == 0) {
            switch (color) {
                case colorERROR:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.log-container > div").lastChild.setAttribute('style', 'color: red');
                    break;
                case colorSUCCESS:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.log-container > div").lastChild.setAttribute('style', 'color: green');
                    break;
                case colorINFO:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.log-container > div").lastChild.setAttribute('style', 'color: blue');
                    break;
                default:
                    // leave font color as BLACK
                    break;
            }
            // scroll into view
            document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.log-container > div").lastChild.scrollIntoViewIfNeeded();
        }
        // ELSE ADMIN MODE (document.getElementsByClassName('admin').length == 2)
        else {
            switch (color) {
                case colorERROR:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.log-container > div").lastChild.setAttribute('style', 'color: red');
                    break;
                case colorSUCCESS:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.log-container > div").lastChild.setAttribute('style', 'color: green');
                    break;
                case colorINFO:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.log-container > div").lastChild.setAttribute('style', 'color: blue');
                    break;
                default:
                    // leave font color as BLACK
                    break;
            }
            // scroll into view
            document.querySelector("#outcome-view-home > div.outcomes-div > div.log-container > div").lastChild.scrollIntoViewIfNeeded();
        }
    }
}

// Print colored "msg" to STATUS text box
function appendStatus(msg, color) {
    console.table('appendStatus', msg);

    if ($('.status-div').length) {
        $('.status-div').append(`<div class='status-text-content'>${JSON.stringify(msg)}</div>`);
        try {
          $(".status-div").scrollTop($(".status-div")[3].scrollHeight);
        } catch {}
        // IF USER MODE
        if (document.getElementsByClassName('admin').length == 0) {
            switch (color) {
                case colorERROR:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.status-container > div").lastChild.setAttribute('style', 'color: red');
                    break;
                case colorSUCCESS:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.status-container > div").lastChild.setAttribute('style', 'color: green');
                    break;
                case colorINFO:
                    document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.status-container > div").lastChild.setAttribute('style', 'color: blue');
                    break;
                default:
                    // leave font color as BLACK
                    break;
            }
            // scroll into view
            document.querySelector("#greenhouse-1-view > div.right-info-div > div.outcome-view > div > div.status-container > div").lastChild.scrollIntoViewIfNeeded();
        }
        // ELSE ADMIN MODE (document.getElementsByClassName('admin').length == 2)
        else {
            switch (color) {
                case colorERROR:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.status-container > div").lastChild.setAttribute('style', 'color: red');
                    break;
                case colorSUCCESS:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.status-container > div").lastChild.setAttribute('style', 'color: green');
                    break;
                case colorINFO:
                    document.querySelector("#outcome-view-home > div.outcomes-div > div.status-container > div").lastChild.setAttribute('style', 'color: blue');
                    break;
                default:
                    // leave font color as BLACK
                    break;
            }
            // scroll into view
            document.querySelector("#outcome-view-home > div.outcomes-div > div.status-container > div").lastChild.scrollIntoViewIfNeeded();
        }
    }
}

// Display LCD DATA from IOT to WebApp Virtual LCD Display
function renderDataOnScreen(msg) {
    try {
        $(".panel-text-r1").html(msg.data1);
        $(".panel-text-r2").html(msg.data2);
        $(".panel-text-r3").html(msg.data3);
        $(".panel-text-r4").html(msg.data4);
    } catch (e) {
        console.error('renderDataOnScreen.error', e); // needed ??
        appendStatus(`Render LCD Data to Display ERROR`, colorERROR);
    }
}

// Parse IOT return COMMAND for action
function processTheIOTResponse(dataFromIOT) {
    objectFromIOT = dataFromIOT;

    // Check if there is a msg
    if (!objectFromIOT.msg) {
        appendStatus(`No MESSAGE DATA received from WIFI Client ${JSON.stringify(objectFromIOT, null, 2)}.`, colorERROR);
        return;
    }
    // 
    switch (objectFromIOT.msg.command) {
        case CMD_RET_LCD_DATA:
            appendStatus(`=======CMD_RET_LCD_DATA=======`, colorSUCCESS);
            renderDataOnScreen(objectFromIOT.msg);
            break;
        case CMD_RET_LOG:
            appendLogs(`==========CMD_RET_LOG=========`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.data1}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.data2}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.data3}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.data4}`, colorSUCCESS);
            break;
        case CMD_RET_MAP_DATA:
            // appendStatus(`=======CMD_RET_MAP_DATA=======`);
            appendStatus(`CMD_RET_MAP_DATA Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_WIFI_STATUS:
            // appendStatus(`=====CMD_RET_WIFI_STATUS======`);
            appendStatus(`CMD_RET_WIFI_STATUS Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_WIFI_CONFIG:
            // appendStatus(`=====CMD_RET_WIFI_CONFIG======`);
            appendStatus(`CMD_RET_WIFI_CONFIG Command  Implemented`, colorERROR);
            break;
        case CMD_RET_MPU_STATUS:
            // appendStatus(`=====CMD_RET_MPU_STATUS=======`);
            appendStatus(`CMD_RET_MPU_STATUS Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_MPU_CONFIG:
            // appendStatus(`=====CMD_RET_MPU_CONFIG=======`);
            appendStatus(`CMD_RET_MPU_CONFIG Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_STATUS:
            // appendStatus(`========CMD_RET_STATUS=========`);
            appendStatus(`CMD_RET_STATUS Command Not Implemented`, colorERROR);
            break;
        default:
            appendStatus(`${objectFromIOT.msg.command} Command Not Implemented`, colorERROR);
    }
}