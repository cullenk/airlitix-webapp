// const { forEach } = require("lodash");
const { forEach } = require('lodash');

// IOT COMMANDS
// let CMD_RESERVED_0        = 0;  // RESERVED
let CMD_GET_LCD_DATA      = 1;  // Get LCD DATA
let CMD_SET_LCD_DATA      = 2;  // Set LCD DATA
let CMD_RET_LCD_DATA      = 3;  // Return LCD DATA
let CMD_GET_MAP_DATA      = 4;  // Get MAP DATA
// let CMD_SET_MAP_DATA      = 5;  // Set MAP DATA
let CMD_RET_MAP_DATA      = 6;  // Return MAP DATA
let CMD_GET_LORA_STATUS   = 7;  // Get LORA STATUS
// let CMD_SET_LORA_STATUS   = 8;  // Set LORA STATUS
let CMD_RET_LORA_STATUS   = 9;  // Return LORA STATUS
let CMD_GET_LORA_CONFIG   = 10; // Get LORA CONFIG
// let CMD_SET_LORA_CONFIG   = 11; // Set LORA CONFIG
let CMD_RET_LORA_CONFIG   = 12; // Return LORA CONFIG
let CMD_GET_MCU_STATUS    = 13; // Get MCU STATUS
// let CMD_SET_MCU_STATUS    = 14; // Set MCU STATUS
let CMD_RET_MCU_STATUS    = 15; // Return MCU STATUS
let CMD_GET_MCU_CONFIG    = 16; // Get MCU CONFIG
// let CMD_SET_MCU_CONFIG    = 17; // Set MCU CONFIG
let CMD_RET_MCU_CONFIG    = 18; // Return MCU CONFIG
let CMD_RET_LOG           = 19; // Return LOG
let CMD_RET_STATUS        = 20; // Return STATUS

// MODULE_TYPE: 0=SERVER, 1=OFFICE, 2=GH, 3=BAYWATER, 4=BAYMAP
// let SERVER_TYPE            = 0;
let OFFICE_MODULE_TYPE     = 1;
let GREENHOUSE_MODULE_TYPE = 2;
let BAYWATER_MODULE_TYPE   = 3;
let BAYMAP_MODULE_TYPE     = 4;

// FLAGS for WATER and MAP icons in LOCATION CONTAINER
let mapIconFLAG   = false;
let waterIconFLAG = false;

// Set color variables for FONT colors
let colorDEFAULT = 0; // DEFAULT font color is BLACK
let colorERROR   = 1; // ERROR   font color is RED
let colorSUCCESS = 2; // SUCCESS font color is GREEN
let colorINFO    = 3; // INFOR   font color is BLUE

let colorToHTML = {
  0: 'black',
  1: 'red',
  2: 'green',
  3: 'blue'
};

// structure to IOT
let objectToIOT = {
  office_name: '',     // OFFICE_NAME
  greenhouse_name: '', // greenhouse_NAME
  bay_name: '',        // BAY_NAME
  destModuleType: '',  // MODULE_TYPE: 1=OFF, 2=GH, 3=BAYWater, 4=BAYMap
  command: '',         // IOT COMMAND
  data1: '',           // DATA1: Command input
  data2: ''            // DATA2: Command option input
};

// structure from IOT
let objectFromIOT = {
  command: '',        // COMMAND
  destModuleName: '', // Destination Module Name
  destModuleType: '', // Destination Module Type
  text1: '',          // LCD, MAP, MCU, WiFi, STATUS, LOG return - text LINE1
  text2: '',          // LCD, MAP, MCU, WiFi, STATUS, LOG return - text LINE2
  text3: '',          // LCD, MAP, MCU, WiFi, STATUS, LOG return - text LINE3
  text4: ''           // LCD, MAP, MCU, WiFi, STATUS, LOG return - text LINE4
};

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
    let greenhouseNumber = 1;
    let bayType = "W";
    let bayNumber = 1;
    let allModules = document.getElementsByClassName('greenhouse-cell-div');
    let gearSelected = false;

    socket.on('WIFI-CLIENT-CONNECTED', (data) => {
      if (data.socketId) {
        wifiClient = data.socketId;
        appendLogs(`WIFI Client ${data.socketId} connected.`, colorSUCCESS);
      } else {
        appendLogs(`No WIFI Client available yet.`, colorERROR);
      }
    });
    socket.on('WIFI-CLIENT-DISCONNECTED', (data) => {
      wifiClient = '';
      appendLogs(`WIFI Client ${data.socketId} disconnected.`, colorERROR);
    });

    socket.on('message', (data) => {
      // appendLogs(`Data received from WIFI Client ${JSON.stringify(data.msg, null, 2)}.`, colorINFO);
    });

    socket.on('fromiot', (responseFromIOT) => {
      processIOTResponse(responseFromIOT);
    });

    socket.emit('join', {
      type: 'WEB'
    });

    // OFFICE GEAR selected or GREENHOUSE GEAR selected (ADMIN mode)
    $('#all-greenhouses-view').on('click', '.greenhouse-grid .greenhouse-cell-div .gear-div', (element) => {
      // set objectToIOT variables according to OFFICE ro GREENHOUSE selected
      objectToIOT.office_name = officeName; // Always the same no matter what OFFICE or GREENHOUSE selected
      allModules.forEach(moduleGear);
      gearSelected = true;
    });

    // GREENHOUSE selected (USER mode)
    $('#all-greenhouses-view').on('click', '.greenhouse-grid .greenhouse-cell-div .main-greenhouse-div', (element) => {
      // set objectToIOT variables
      objectToIOT.office_name = officeName;
      objectToIOT.greenhouse_name = element.currentTarget.children[0].innerHTML;
      greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];
      objectToIOT.greenhouse_name = "GH " + greenhouseNumber;
      objectToIOT.destModuleType = BAYWATER_MODULE_TYPE;
      objectToIOT.bay_name =  $(".bay-div.selected > h3.bay-heading")[0].innerHTML;
      bayNumber = +objectToIOT.bay_name.split(" ")[1];
      objectToIOT.bay_name = "GH" + greenhouseNumber + "BAYW" + bayNumber;
      // set Selected GH Name in LOCATION
      // document.querySelector("#gh-outcome-num").innerHTML = document.querySelector("#greenhouse-1-view > div.bay-info-div > div.bay-heading-div > h1").innerHTML;
      document.querySelector("#gh-outcome-num").innerHTML = objectToIOT.greenhouse_name;
      // set Selected BAY Name in LOCATION
      document.querySelector("#bay-outcome-num").innerHTML = document.getElementsByClassName('bay-div selected')[0].innerText;
      // add default WATER icon to BAY LOCATION
      addWaterIcon(objectToIOT);
    });

    // BAY selected
    $('.bay-div').on('click', (element) => {
      // set objectToIOT variables
      greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];
      objectToIOT.bay_name = element.currentTarget.children[0].innerHTML;
      bayNumber = +objectToIOT.bay_name.split(" ")[1];
      if (objectToIOT.destModuleType == BAYMAP_MODULE_TYPE) {
        bayType = "M";
      }
      objectToIOT.bay_name = "GH" + greenhouseNumber + "BAY" + bayType + bayNumber;

      // set Selected BAY Name in LOCATION
      // document.querySelector("#bay-outcome-num").innerHTML = element.currentTarget.children[0].innerHTML;
      document.querySelector("#bay-outcome-num").innerHTML = objectToIOT.bay_name;
    });

    // // LOCATION CONTAINER BAY WATER icon selected - toggle to MAP icon
    // $('.location-container').on('click', 'bay-icon-container-water', (element) => {
    //   // add MAP icon to BAY LOCATION
    //   addMapIcon(objectToIOT);
    // });

    // // LOCATION CONTAINER BAY MAP icon selected - toggle to WATER icon
    // $('.location-container').on('click', 'bay-icon-container-map', (element) => {
    //   // add WATER icon to BAY LOCATION
    //   addWaterIcon(objectToIOT);
    // });
 
    // Reset and Hide elements when selecting ADMIN->USER mode
    $('.toggle-handle').on('click', '.toggle-div' , (element) => {
        gearSelected = false;
    });

    // Reset and Hide elements when selecting USER->ADMIN mode
    $('.toggle-handle').on('click', '.toggle-div .admin' , (element) => {
      greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];
    
      // Show LOG and STATUS text boxes when selecting USER->ADMIN mode
      // document.querySelector("#greenhouse-${greenhouseNumber}-view > div.right-info-div > div.outcome-view").style.display='flex';
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.right-info-div > div.outcome-view").style.display='none';

      // Change ACTION string to '' if ACTION is NOT WATER or MAPPING
      if (($(".action-outcome").html() !== 'Water') && ($(".action-outcome").html() !== 'Mapping')) {
        document.querySelector("#action-outcome").innerHTML='';
      }

      // Hide any action boxes and unselect menu icons and menu text (but not for WATER or MAPPING)
      // ===== WiFi_STATUS
      // Hide WiFi_STATUS action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.wifi-container").style.display='none';
      // Hide WiFi_STATUS menu icon and text
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-wifi > div.operation-icon.wifi").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-wifi > div.home-operation-text").style.color='white';
      
      // ===== WiFI_CONFIG
      // Hide WiFI_CONFIG action box
      document.querySelector("#greenhouse-3-view > div.main-action-div > div.wifi-config-container").style.display='none';
      // Hide WiFI_CONFIG menu icon and text
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-wifi-config > div.operation-icon.wifi-config").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-wifi-config > div.home-operation-text").style.color='white';
      
      // ===== MCU_STATUS
      // Hide MCU_STATUS action box
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.main-action-div > div.mpu-status-container").style.display='none';
      // Hide MCU_STATUS menu icon and text
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-mpu > div.operation-icon.mpu").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-mpu > div.home-operation-text").style.color='white';

      // ===== MCU_CONFIG
      // Hide MCU_CONFIG action box
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.main-action-div > div.mpu-config-container").style.display='none';
      // Hide MCU_CONFIG menu icon and text
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-mpu-config > div.operation-icon.mpu-config").className='operation-icon mpu-config';
      document.querySelector("#greenhouse-${greenhouseNumber}-view > div.menu-container > div.admin-menu > div > div.admin-mpu-config > div.home-operation-text").style.color='white';
    });

    // KEYPAD BUTTON selected
    $('.keypad-btn').on('click', (element) => {
      // set objectToIOT variables
      objectToIOT.command = CMD_SET_LCD_DATA;
      objectToIOT.data1 = parseInt(element.currentTarget.children[0].innerHTML);
      objectToIOT.data2 = 0;

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
      // SET ACTION TO 'Water'
      document.querySelector("#action-outcome").innerHTML='Water';
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
      // SET ACTION TO 'Mapping'
      document.querySelector("#action-outcome").innerHTML='Mapping';
      // Send MAP DATA request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // WIFI-STATUS menu button selected
    $('.wifi').on('click', (element) => {
      objectToIOT.command = CMD_GET_LORA_STATUS;
      appendStatus(objectToIOT, colorINFO);
      // SET ACTION TO 'WiFi Status'
      document.querySelector("#action-outcome").innerHTML='WiFi Status';
      // Send WiFi STATUS request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // WIFI-CONFIG menu button selected
    $('.wifi-config').on('click', (element) => {
      objectToIOT.command = CMD_GET_LORA_CONFIG;
      appendStatus(objectToIOT, colorINFO);
      // SET ACTION TO 'WiFi Config'
      document.querySelector("#action-outcome").innerHTML='WiFi Config';
      // Send WiFi CONFIG request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // MCU-STATUS menu button selected
    $('.mpu').on('click', (element) => {
      objectToIOT.command = CMD_GET_MCU_STATUS;
      appendStatus(objectToIOT, colorINFO);
      // SET ACTION TO 'MCU Status'
      document.querySelector("#action-outcome").innerHTML='MCU Status';
      // Send MCU STATUS request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });

    // MCU-CONFIG menu button selected
    $('.mpu-config').on('click', (element) => {
      objectToIOT.command = CMD_GET_MCU_CONFIG;
      appendStatus(objectToIOT, colorINFO);
      // SET ACTION TO 'MCU Config'
      document.querySelector("#action-outcome").innerHTML='MCU Config';
      // Send MCU CONFIG request to IOT
      socket.emit('toiot', {
        receiverId: wifiClient,
        senderId: socket.id,
        msg: objectToIOT
      });
    });
});

function moduleGear(module) {
  if (module.children[0].classList[1] == 'selected') {
    if (module.children[1].children[0].innerHTML == 'Office') { // OFFICE MODULE selected
      objectToIOT.destModuleType = OFFICE_MODULE_TYPE;
      objectToIOT.greenhouse_name = '';
      objectToIOT.bay_name = '';
    } else { // GREENHOUSE MODULE selected
      objectToIOT.greenhouse_name = module.children[1].children[0].innerHTML;
      greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];
      objectToIOT.greenhouse_name = "GH " + greenhouseNumber;
      objectToIOT.destModuleType = GREENHOUSE_MODULE_TYPE;
      objectToIOT.bay_name = '';
    } // else
  } // if (selected)
}

// Add WATER ICON before BAY location text
function addWaterIcon(objectToIOT) {
    // Get selected greenhouse
    greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];

    // If MAP ICON is up, remove it
    if (mapIconFLAG == true) {
        document.querySelector(`#greenhouse-${greenhouseNumber}-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > div:nth-child(1)`).remove();
        mapIconFLAG = false;
    }
    // If WATER ICON is NOT up, add it
    if (waterIconFLAG == false) {
        var el = document.createElement("div");
        el.className = "bay-icon-container-water";
        document.querySelector(`#greenhouse-${greenhouseNumber}-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2`).innerHTML="BAY WATER: ";
        $(document.querySelector(`#greenhouse-${greenhouseNumber}-view > div.right-info-div > div.outcome-header > div > div:nth-child(2) > h2`)).before(el);
        waterIconFLAG = true;
    }
    // Set TARGETTYPE to BAYWATER
    objectToIOT.destModuleType = BAYWATER_MODULE_TYPE;
    document.getElementsByClassName('mapping-container')[greenhouseNumber-1].style.display = "none";
    document.getElementsByClassName('water-panel-container')[greenhouseNumber-1].style.display = "block";
    document.getElementsByClassName('outcome-view')[greenhouseNumber-1].style.display = "flex";
    // SET ACTION TO 'Water'
    document.querySelector("#action-outcome").innerHTML='Water';
}

// Add MAP ICON before BAY location text
function addMapIcon(objectToIOT) {
    // Get selected greenhouse
    greenhouseNumber = +objectToIOT.greenhouse_name.split(" ")[1];

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
    objectToIOT.destModuleType = BAYMAP_MODULE_TYPE;
    document.getElementsByClassName('water-panel-container')[greenhouseNumber-1].style.display = "none";
    document.getElementsByClassName('mapping-container')[greenhouseNumber-1].style.display = "block";
    document.getElementsByClassName('outcome-view')[greenhouseNumber-1].style.display = "flex";
    // SET ACTION TO 'Mapping'
    document.querySelector("#action-outcome").innerHTML='Mapping';
}

// Print colored "msg" to LOG text box
function appendLogs(msg, color, ObjectIOT) {
    console.table('appendLogs', msg);

    if ($('.log-div').length) {
        $('.log-div').append(`<div class='log-text-content' style="font-size: 0.8vw; color: ${colorToHTML[color]};">${JSON.stringify(msg)}</div>`);
        try {
          // Get selected greenhouse
          greenhouseNumber = +ObjectIOT.greenhouse_name.split(" ")[1];
          $(".log-div").scrollTop($(".log-div")[greenhouseNumber].scrollHeight);
        } catch {}
    }
}

// Print colored "msg" to STATUS text box
function appendStatus(msg, color) {
    console.table('appendStatus', msg);

    if ($('.status-div').length) {
        $('.status-div').append(`<div class='status-text-content' style="font-size: 0.8vw; color: ${colorToHTML[color]};">${JSON.stringify(msg)}</div>`);
        try {
          greenhouseNumber = +ObjectIOT.greenhouse_name.split(" ")[1];
          $(".status-div").scrollTop($(".status-div")[greenhouseNumber].scrollHeight);
        } catch {}
    }
}

// Display LCD DATA from IOT to WebApp Virtual LCD Display
function renderLCDData(msg) {
  console.table('renderLCDData', msg);
  try {
      $(".panel-text-r1").html(msg.text1);
      $(".panel-text-r2").html(msg.text2);
      $(".panel-text-r3").html(msg.text3);
      $(".panel-text-r4").html(msg.text4);
  } catch (e) {
      console.error('renderLCDData.error', e); // needed ??
      appendStatus(`Render LCD Data to Display ERROR`, colorERROR);
  }
}

// Parse IOT return COMMAND for action
function processIOTResponse(dataFromIOT) {
    objectFromIOT = dataFromIOT;

    // Check if there is a msg
    if (!objectFromIOT.msg) {
        appendStatus(`No DATA received from WIFI Client ${JSON.stringify(objectFromIOT, null, 2)}.`, colorERROR);
        return;
    }
    // 
    switch (objectFromIOT.msg.command) {
        case CMD_RET_LCD_DATA:
            appendLogs(`=======CMD_RET_LCD_DATA=======`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text1}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text2}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text3}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text4}`, colorSUCCESS);
            renderLCDData(objectFromIOT.msg);
            break;
        case CMD_RET_LOG:
            appendLogs(`==========CMD_RET_LOG=========`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text1}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text2}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text3}`, colorSUCCESS);
            appendLogs(`${objectFromIOT.msg.text4}`, colorSUCCESS);
            break;
        case CMD_RET_MAP_DATA:
            // appendStatus(`=======CMD_RET_MAP_DATA=======`);
            appendStatus(`CMD_RET_MAP_DATA Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_LORA_STATUS:
            // appendStatus(`=====CMD_RET_LORA_STATUS======`);
            appendStatus(`CMD_RET_LORA_STATUS Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_LORA_CONFIG:
            // appendStatus(`=====CMD_RET_LORA_CONFIG======`);
            appendStatus(`CMD_RET_LORA_CONFIG Command  Implemented`, colorERROR);
            break;
        case CMD_RET_MCU_STATUS:
            // appendStatus(`=====CMD_RET_MCU_STATUS=======`);
            appendStatus(`CMD_RET_MCU_STATUS Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_MCU_CONFIG:
            // appendStatus(`=====CMD_RET_MCU_CONFIG=======`);
            appendStatus(`CMD_RET_MCU_CONFIG Command Not Implemented`, colorERROR);
            break;
        case CMD_RET_STATUS:
            // appendStatus(`========CMD_RET_STATUS=========`);
            appendStatus(`CMD_RET_STATUS Command Not Implemented`, colorERROR);
            break;
        default:
            appendStatus(`Unknown Command: ${objectFromIOT.msg.command}`, colorERROR);
    }
}