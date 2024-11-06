import { Component, OnInit, OnDestroy } from "@angular/core";
import * as html2pdf from "html2pdf.js";
import { MatDialog } from "@angular/material";
import { BookingService } from "../../booking/booking.service";
import { DialougComponent } from "src/app/shared/dialoug/dialoug.component";
import { TranslateService } from "@ngx-translate/core";
import { DataStorageService } from "src/app/core/services/data-storage.service";
import { NotificationDtoModel } from "src/app/shared/models/notification-model/notification-dto.model";
import { NotificationDtoModelv2 } from "src/app/shared/models/notification-model/notificationv2-dto.model";
import Utils from "src/app/app.util";
import * as appConstants from "../../../app.constants";
import { RequestModel } from "src/app/shared/models/request-model/RequestModel";
import { Subscription } from "rxjs";
import { ConfigService } from "src/app/core/services/config.service";
import { ActivatedRoute, Router } from "@angular/router";
import { NameList } from "src/app/shared/models/demographic-model/name-list.modal";
import { UserModel } from "src/app/shared/models/demographic-model/user.modal";
import { PRNRequestModel } from "src/app/shared/models/request-model/prnrequestModel";
import { PRNResponseModel } from "src/app/shared/models/request-model/prnresponseModel";


@Component({
  selector: "app-acknowledgement",
  templateUrl: "./acknowledgement.component.html",
  styleUrls: ["./acknowledgement.component.css"],
})
export class AcknowledgementComponent implements OnInit, OnDestroy {
  usersInfoArr = [];
  ackDataArr = [];
  ackDataItem = {};
  guidelines = [];
  guidelinesDetails = [];
  pdfOptions = {};
  fileBlob: Blob;
  errorlabels: any;
  apiErrorCodes: any;
  showSpinner: boolean = true;
  PRN:string="";
  PRNerrorMessage="";
  amount:string="";
  //notificationRequest = new FormData();
  bookingDataPrimary = "";
  bookingDataSecondary = "";
  subscriptions: Subscription[] = [];
  notificationTypes: string[];
  preRegIds: any;
  userService: any;
  ltrLangs = this.configService
    .getConfigByKey(appConstants.CONFIG_KEYS.mosip_left_to_right_orientation)
    .split(",");
  regCenterId = "10045";
  langCode;
  textDir = localStorage.getItem("dir");
  name = "";
  // givenName = "";
  // createdDateTimeString;
  // createdDateTime;
  // createdDate;
  createdTime;
  applicantContactDetails = [];
  constructor(
    private bookingService: BookingService,
    private dialog: MatDialog,
    private translate: TranslateService,
    private dataStorageService: DataStorageService,
    private configService: ConfigService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    this.translate.use(localStorage.getItem("langCode"));
    this.langCode = localStorage.getItem("langCode");
  }

  async ngOnInit() {
    if (this.router.url.includes("multiappointment")) {
      this.preRegIds = [...JSON.parse(localStorage.getItem("multiappointment"))];
    } else {
      this.activatedRoute.params.subscribe((param) => {
        this.preRegIds = [param["appId"]];
      });
    }
    this.dataStorageService
      .getI18NLanguageFiles(this.langCode)
      .subscribe((response) => {
        this.errorlabels = response[appConstants.ERROR];
        this.apiErrorCodes = response[appConstants.API_ERROR_CODES];
      });
    this.name = this.configService.getConfigByKey(
      appConstants.CONFIG_KEYS.preregistration_identity_name
    );
    await this.updateApplicationStatus();
    await this.getUserInfo(this.preRegIds);
    //console.log(this.usersInfoArr);
    for (let i = 0; i < this.usersInfoArr.length; i++) {
      await this.getRegCenterDetails(this.usersInfoArr[i].langCode, i);
      console.log("after get reg centre details")
      await this.getLabelDetails(this.usersInfoArr[i].langCode, i);
      console.log("after get reg centre details2")
      await this.getUserLangLabelDetails(this.langCode, i);
      console.log("after get reg centre details3")
    }

    let notificationTypes = this.configService
      .getConfigByKey(appConstants.CONFIG_KEYS.mosip_notification_type)
      .split("|");
    this.notificationTypes = notificationTypes.map((item) =>
      item.toUpperCase()
    );


    await this.apiCalls();
    console.log("in ackw.component.ts in ngOnInit()")
    if (this.bookingService.getSendNotification()) {
      this.bookingService.resetSendNotification();
      await this.automaticNotification();
    }
    this.prepareAckDataForUI();
    this.showSpinner = false;
  }
  updateApplicationStatus = async () => {
    return new Promise((resolve) => {
      this.preRegIds.forEach(async (prid: any, index) => {
        this.dataStorageService.updateApplicationStatus(
          prid, appConstants.APPLICATION_STATUS_CODES.booked)
          .subscribe(
            (response) => {
              resolve(true);
            },
            (error) => {
              resolve(true);
            }
          );
      });
    });
  }
  async getUserInfo(preRegIds: string[]) {
    debugger

    return new Promise((resolve) => {
      preRegIds.forEach(async (prid: any, index) => {
        await this.getUserDetails(prid).then(async (user) => {
          let regDto;
          console.log(user);
          await this.getAppointmentDetails(prid).then((appointmentDetails) => {
            regDto = appointmentDetails;
          });
          console.log("after appointment deatils")
          const demographicData = user["request"].demographicDetails.identity;
          let applicationLanguages = Utils.getApplicationLangs(user["request"]);
          applicationLanguages = Utils.reorderLangsForUserPreferredLang(applicationLanguages, this.langCode);
          applicationLanguages.forEach(applicationLang => {
            const nameListObj: NameList = {
              preRegId: "",
              fullName: "",
              regDto: "",
              status: "",
              registrationCenter: "",
              bookingData: "",
              postalCode: "",
              langCode: "",
              labelDetails: [],
              userLangLabelDetails: []
            };
            nameListObj.preRegId = user["request"].preRegistrationId;
            nameListObj.status = user["request"].statusCode;

            //malay-->for pdf data change
            // if (user["request"].demographicDetails.identity.givenName[0].value) {
            //   this.givenName = user["request"].demographicDetails.identity.givenName[0].value;
            //   console.log("user data malay " + user["request"].demographicDetails.identity.givenName[0].value)
            // }
            // if (user["request"].createdDateTime) {
            //   this.createdDateTimeString = user["request"].createdDateTime;

            //   this.createdDateTime = new Date(this.createdDateTimeString);
            //   this.createdDate = this.createdDateTime.toLocaleDateString(); // Format date based on locale
            //   this.createdTime = this.createdDateTime.toLocaleTimeString();
            //   console.log("user data malay1 " + user["request"].createdDateTime)
            //   console.log("user data malay1 " + this.createdDate)
            //   console.log("user data malay1 " + this.createdTime)
            // }

            //for pdf -->data change end malay.

            if (demographicData[this.name]) {
              let nameValues = demographicData[this.name];
              nameValues.forEach(nameVal => {
                if (nameVal["language"] == applicationLang) {
                  nameListObj.fullName = nameVal["value"];
                }
              });
            }
            if (demographicData["postalCode"]) {
              nameListObj.postalCode = demographicData["postalCode"];
            }
            nameListObj.registrationCenter = "";
            nameListObj.langCode = applicationLang;
            nameListObj.regDto = regDto;
            this.usersInfoArr.push(nameListObj);
            if (!this.userService) {
              this.userService = demographicData["userService"];
            }
            //console.log(this.usersInfoArr);
            this.applicantContactDetails.push({
              "preRegId": user["request"].preRegistrationId,
              "phone": demographicData["phone"],
              "email": demographicData["email"]
            });
          });
          this.generatePaymentRefNum(demographicData)
        });
        if (index === preRegIds.length - 1) {
          resolve(true);
        }
      });
    });
  }

  getUserDetails(prid) {
    return new Promise((resolve) => {
      this.dataStorageService.getUser(prid.toString()).subscribe((response) => {
        if (response[appConstants.RESPONSE] !== null) {
          resolve(
            new UserModel(
              prid.toString(),
              response[appConstants.RESPONSE],
              undefined,
              []
            )
          );
        }
      },
        (error) => {
          this.showErrorMessage(error);
        });
    });
  }

  getAppointmentDetails(preRegId) {
    return new Promise((resolve) => {
      this.dataStorageService
        .getAppointmentDetails(preRegId)
        .subscribe((response) => {
          console.log(response);
          if (response[appConstants.RESPONSE]) {
            this.regCenterId =
              response[appConstants.RESPONSE].registration_center_id;
            console.log("regCentreId" + this.regCenterId)
          }
          resolve(response[appConstants.RESPONSE]);
        },
          (error) => {
            this.showErrorMessage(error);
          });
    });
  }

  getRegCenterDetails(langCode, index) {
    console.log("in getRegCenterDetails")
    console.log(this.regCenterId)
    return new Promise((resolve) => {
      this.dataStorageService
        .getRegistrationCentersById(this.regCenterId, langCode)
        .subscribe((response) => {
          console.log("after fetching registration centre:: " + response)
          if (response[appConstants.RESPONSE]) {
            this.usersInfoArr[index].registrationCenter =
              response[appConstants.RESPONSE].registrationCenters[0];
            resolve(true);
          }
        },
          (error) => {
            this.usersInfoArr[index].registrationCenter = "";
            resolve(true);
            //suppress the err popup, as reg center maybe added only in one lang
            //this.showErrorMessage(error);
          });
    });
  }

  async getLabelDetails(langCode, index) {
    return new Promise((resolve) => {
      this.dataStorageService
        .getI18NLanguageFiles(langCode)
        .subscribe((response) => {
          this.usersInfoArr[index].labelDetails.push(response["acknowledgement"]);
          //console.log(this.usersInfoArr[index].labelDetails);
          resolve(true);
        });
    });
  }

  async getUserLangLabelDetails(langCode, index) {
    return new Promise((resolve) => {
      this.dataStorageService
        .getI18NLanguageFiles(langCode)
        .subscribe((response) => {
          this.usersInfoArr[index].userLangLabelDetails.push(response["acknowledgement"]);
          //console.log(this.usersInfoArr[index].labelDetails);
          resolve(true);
        });
    });
  }

  prepareAckDataForUI() {
    this.preRegIds.forEach(prid => {
      let ackDataItem = {
        "qrCodeBlob": null,
      };
      let preRegIdLabels = [],
        appDateLabels = [],
        //contactPhoneLabels = [],
        messages = [],
        labelNames = [],
        nameValues = [],
        givenNames = [],
        createdDate = [],
        createdTime = [],
        //labelRegCntrs = [],
        //regCntrNames = [],
        appLangCode = [];
      //bookingDataPrimary = [],
      //bookingTimePrimary = [];

      this.ackDataItem["preRegId"] = prid;

      // this.ackDataItem["contactPhone"] =
      //   this.usersInfoArr[0].registrationCenter.contactPhone;
      this.ackDataItem["Suname"] =
        this.usersInfoArr[0].fullName;
      // if(this.givenName){
      //   this.ackDataItem["Name"] = this.givenName;
      // }
      // if(this.createdDate){
      //   this.ackDataItem["Date"] = this.createdDate;
      // }
      // if(this.createdTime){
      //   this.ackDataItem["Time"] = this.createdTime;
      // }

      this.usersInfoArr.forEach(userInfo => {
        if (userInfo.preRegId == prid) {
          this.ackDataItem["qrCodeBlob"] = userInfo.qrCodeBlob;
          const labels = userInfo.labelDetails[0];
          preRegIdLabels.push(labels.label_pre_id);
          appDateLabels.push(labels.label_appointment_date_time);
          //contactPhoneLabels.push(labels.label_cntr_contact_number);
          labelNames.push(labels.label_name);
          //labelRegCntrs.push(labels.label_reg_cntr);
          nameValues.push(userInfo.fullName);
          let name = userInfo.fullName
          console.log(name);

          // console.log(userInfo.registrationCenter.name);
          // if (userInfo.registrationCenter.name) {
          //   // regCntrNames.push(userInfo.registrationCenter.name);
          // }
          // if (this.givenName) {
          //   givenNames.push(this.givenName);
          // }
          // if (this.createdDate) {
          //   createdDate.push(this.createdDate);
          // }
          // if (this.createdTime) {
          //   createdTime.push(this.createdTime);
          // }
          appLangCode.push(userInfo.langCode);
          //set the message in user login lang if available
          let fltrLangs = this.usersInfoArr.filter(userInfoItm => userInfoItm.preRegId == userInfo.preRegId && userInfoItm.langCode == this.langCode);
          if (fltrLangs.length == 1) {
            //matching lang found
            // bookingTimePrimary.push({
            //   langCode: userInfo.langCode,
            //   time:userInfo.bookingTimePrimary,
            //   langAvailable: true
            // });
            // bookingDataPrimary.push({
            //   langCode: userInfo.langCode,
            //   date:userInfo.bookingDataPrimary,
            //   langAvailable: true
            // });  
            let fltr = messages.filter(msg => msg.preRegId == fltrLangs[0].preRegId);
            if (fltr.length == 0) {
              messages.push({
                "preRegId": fltrLangs[0].preRegId,
                //"message": "The Application ID has been sent to the registered email id and phone number"
                "message": fltrLangs[0].labelDetails[0].message
              });
            }
          } else {
            //matching lang found
            // bookingTimePrimary.push({
            //   langCode: userInfo.langCode,
            //   time:userInfo.bookingTimePrimary,
            //   langAvailable: false
            // });
            // bookingDataPrimary.push({
            //   langCode: userInfo.langCode,
            //   date:userInfo.bookingDataPrimary,
            //   langAvailable: false
            // });  
            let fltr = messages.filter(msg => msg.preRegId == userInfo.preRegId);
            if (fltr.length == 0) {
              messages.push({
                "preRegId": userInfo.preRegId,
                "message": userInfo.userLangLabelDetails[0].message
              });
            }
          }
        }
      });
      //console.log(appLangCode);
      if (this.ltrLangs.includes(appLangCode[0])) {
        this.ackDataItem["appLangCodeDir"] = "ltr";
      } else {
        this.ackDataItem["appLangCodeDir"] = "rtl";
      }
      this.ackDataItem["appLangCode"] = appLangCode;
      //this.ackDataItem["bookingTimePrimary"] = bookingTimePrimary;
      //this.ackDataItem["bookingDataPrimary"] = bookingDataPrimary;
      this.ackDataItem["preRegIdLabels"] = JSON.stringify(
        preRegIdLabels
      )
        .replace(/\[/g, "")
        .replace(/,/g, " / ")
        .replace(/"/g, " ")
        .replace(/]/g, "");
      this.ackDataItem["appDateLabels"] = JSON.stringify(appDateLabels)
        .replace(/\[/g, "")
        .replace(/,/g, " / ")
        .replace(/"/g, " ")
        .replace(/]/g, "");
      // this.ackDataItem["contactPhoneLabels"] = JSON.stringify(
      //   contactPhoneLabels
      // )
      //   .replace(/\[/g, "")
      //   .replace(/,/g, " / ")
      //   .replace(/"/g, " ")
      //   .replace(/]/g, "");
      this.ackDataItem["messages"] = messages;
      this.ackDataItem["labelNames"] = JSON.stringify(labelNames)
        .replace(/\[/g, "")
        .replace(/,/g, " / ")
        .replace(/"/g, " ")
        .replace(/]/g, "");
      this.ackDataItem["nameValues"] = JSON.stringify(nameValues)
        .replace(/\[/g, "")
        .replace(/,/g, " / ")
        .replace(/"/g, " ")
        .replace(/]/g, "");
      // this.ackDataItem["labelRegCntrs"] = JSON.stringify(labelRegCntrs)
      //   .replace(/\[/g, "")
      //   .replace(/,/g, " / ")
      //   .replace(/"/g, " ")
      //   .replace(/]/g, "");
      // this.ackDataItem["regCntrNames"] = JSON.stringify(regCntrNames)
      //   .replace(/\[/g, "")
      //   .replace(/,/g, " / ")
      //   .replace(/"/g, " ")
      //   .replace(/]/g, "");
      for (let j = 0; j < this.guidelines.length; j++) {
        if (appLangCode.includes(this.guidelines[j].langCode)) {
          this.ackDataItem[
            this.guidelines[j].langCode
          ] = this.guidelines[j].fileText.split("\n");
        }
      }
      this.ackDataArr.push(this.ackDataItem);
      this.ackDataItem = {};
    });

  }

  async apiCalls() {
    return new Promise(async (resolve) => {
      this.formatDateTime();
      await this.qrCodeForUser();
      await this.getTemplate();

      resolve(true);
    });
  }

  async qrCodeForUser() {
    return new Promise((resolve) => {
      this.usersInfoArr.forEach(async (user) => {
        //console.log(user);
        await this.generateQRCode(user);
        if (this.usersInfoArr.indexOf(user) === this.usersInfoArr.length - 1) {
          resolve(true);
        }
      });
    });
  }

  formatDateTime() {
    const ltrLangs = this.configService
      .getConfigByKey(appConstants.CONFIG_KEYS.mosip_left_to_right_orientation)
      .split(",");
    this.usersInfoArr.forEach(userInfo => {
      if (!userInfo.bookingData) {
        userInfo.bookingDataPrimary = Utils.getBookingDateTime(
          userInfo.regDto.appointment_date,
          userInfo.regDto.time_slot_from,
          userInfo.langCode,
          ltrLangs
        );
        userInfo.bookingTimePrimary = Utils.formatTime(
          userInfo.regDto.time_slot_from
        );
      } else {
        const date = userInfo.bookingData.split(",");
        userInfo.bookingDataPrimary = Utils.getBookingDateTime(
          date[0],
          date[1],
          userInfo.langCode,
          ltrLangs
        );
        userInfo.bookingTimePrimary = Utils.formatTime(date[1]);
      }
    });
  }

  automaticNotification() {
    console.log("inside automaticNotification")
    setTimeout(() => {
      this.sendNotification(this.applicantContactDetails, false);
    }, 500);
  }

  getTemplate() {
    return new Promise((resolve) => {
      const subs = this.dataStorageService
        .getGuidelineTemplate("Onscreen-Acknowledgement")
        .subscribe((response) => {
          this.guidelines = response["response"]["templates"];
          //console.log(this.guidelines);
          resolve(true);
        });
      this.subscriptions.push(subs);
    });
  }

  download() {
    this.ackDataArr.forEach(ackDataItem => {
      const preRegId = ackDataItem["preRegId"];
      this.pdfOptions = {
        margin: [15, 15],
        filename: preRegId + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 1, letterRendering: true },
        jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const element = document.getElementById("pdf-section" + "-" + preRegId);
      window.scroll(0, 0);
      html2pdf(element, this.pdfOptions);
    });
  }

  // async generateBlob() {
  //   const element = document.getElementById("print-section");
  //   return await html2pdf()
  //     .set(this.pdfOptions)
  //     .from(element)
  //     .outputPdf("dataurlstring");
  // }

  // async createBlob() {
  //   const dataUrl = await this.generateBlob();
  //   // convert base64 to raw binary data held in a string
  //   const byteString = atob(dataUrl.split(",")[1]);

  //   // separate out the mime component
  //   const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];

  //   // write the bytes of the string to an ArrayBuffer
  //   const arrayBuffer = new ArrayBuffer(byteString.length);

  //   var _ia = new Uint8Array(arrayBuffer);
  //   for (let i = 0; i < byteString.length; i++) {
  //     _ia[i] = byteString.charCodeAt(i);
  //   }

  //   const dataView = new DataView(arrayBuffer);
  //   return await new Blob([dataView], { type: mimeString });
  // }

  sendAcknowledgement() {
    console.log("in sendAcknowledgement")
    const data = {
      case: "SEND_ACKNOWLEDGEMENT",
      notificationTypes: this.notificationTypes,
    };
    const subs = this.dialog
      .open(DialougComponent, {
        width: "350px",
        data: data
      })
      .afterClosed()
      .subscribe((applicantNumber) => {
        //console.log(applicantNumber);
        if (applicantNumber !== undefined) {
          this.preRegIds.forEach(preRegId => {
            this.applicantContactDetails.push({
              "preRegId": preRegId,
              "phone": applicantNumber[1],
              "email": applicantNumber[0]
            });
          });
          this.sendNotification(this.applicantContactDetails, true);
        }
      });
    this.subscriptions.push(subs);
  }

  async generateQRCode(name) {
    try {
      const index = this.usersInfoArr.indexOf(name);
      if (!this.usersInfoArr[index].qrCodeBlob) {
        return new Promise((resolve, reject) => {
          const subs = this.dataStorageService
            .generateQRCode(name.preRegId)
            .subscribe((response) => {
              console.log(response["response"]);
              this.usersInfoArr[index].qrCodeBlob = response["response"].qrcode;
              resolve(true);
            });
        });
      }
    } catch (ex) {
      console.log("this.usersInfo[index].qrCodeBlob >>> " + ex.messages);
    }
  }

  //this.fileBlob = await this.createBlob();
  async sendNotification(contactInfoArr, additionalRecipient: boolean) {
    debugger
    this.preRegIds.forEach(async preRegId => {
      let notificationObject = {};
      console.log("contactInfoArr" + contactInfoArr)
      console.log("usersInfoArr" + this.usersInfoArr)
      this.usersInfoArr.forEach(async (user) => {
        if (preRegId == user.preRegId) {
          let contactInfo = {};
          contactInfoArr.forEach(item => {
            if (item["preRegId"] == preRegId) {
              contactInfo = item;
            }
          });
          notificationObject[user.langCode] = new NotificationDtoModelv2(
            user.fullName,
            user.preRegId,
            user.bookingData
              ? user.bookingData.split(",")[0]
              : user.regDto.appointment_date,
            Number(user.bookingTimePrimary.split(":")[0]) < 10
              ? "0" + user.bookingTimePrimary
              : user.bookingTimePrimary,
            //malay
            contactInfo["phone"] === undefined ? null : contactInfo["phone"],
            contactInfo["email"] === undefined ? null : contactInfo["email"],
            additionalRecipient,
            false,
            contactInfo["userService"] = this.userService
          );
        }
      });
      const model = new RequestModel(
        appConstants.IDS.notification,
        notificationObject
      );
      let notificationRequest = new FormData();
      notificationRequest.append(
        appConstants.notificationDtoKeys.notificationDto,
        JSON.stringify(model).trim()
      );
      notificationRequest.append(
        appConstants.notificationDtoKeys.langCode,
        Object.keys(notificationObject).join(",")
      );
      // notificationRequest.append(
      //   appConstants.notificationDtoKeys.file,
      //   this.fileBlob,
      //   `${preRegId}.pdf`
      // );
      console.log("in sendNotification")
      await this.sendNotificationForPreRegId(notificationRequest);
    });
  }

  private sendNotificationForPreRegId(notificationRequest) {
    console.log("in sendNotificationForPreRegId" + JSON.stringify(notificationRequest))
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataStorageService
          .sendNotification(notificationRequest)
          .subscribe((response) => {
            resolve(true);
          },
            (error) => {
              resolve(true);
              this.showErrorMessage(error);
            })
      );
    });
  }

  /**
   * @description This is a dialoug box whenever an error comes from the server, it will appear.
   *
   * @private
   * @memberof AcknowledgementComponent
   */
  private showErrorMessage(error: any) {
    const titleOnError = this.errorlabels.errorLabel;
    const message = Utils.createErrorMessage(error, this.errorlabels, this.apiErrorCodes, this.configService);
    const body = {
      case: "ERROR",
      title: titleOnError,
      message: message,
      yesButtonText: this.errorlabels.button_ok,
    };
    this.dialog.open(DialougComponent, {
      width: "400px",
      data: body,
    });
  }

/**
   * @description This method checks if the selected desiredService is a payable service 
   * and checks if age is morethan 16 then calls the generate prn endpoint
   *it updates the PRN property that is finally rendered on the acknowledgement slip
   * @private
   * @memberof AcknowledgementComponent
   */
  generatePaymentRefNum(demographicData: any) {
    const surname = demographicData.surname[0].value;
    const nin = demographicData.NIN;
    const desiredService = demographicData.userService; 
    const payablesServices = ["LOST", "UPDATE"];
    const age:number =this.dataStorageService.calculateAge(demographicData.dateOfBirth);
    //console.log(age);
    
    const hasAnyCoreCardData = surname || 
                            demographicData.givenName[0].value || 
                            demographicData.otherNames[0].value || 
                            demographicData.gender[0].value || 
                            demographicData.dateOfBirth || 
                            demographicData.applicantCitizenshipType[0].value;
    const requestBody: PRNRequestModel = {
      service: desiredService,
      NIN: nin,
      fullName: surname
    };

    if (requestBody.fullName &&  requestBody.NIN &&  requestBody.service && payablesServices.includes(requestBody.service)) {
        // Check if service is "UPDATE"
      if (requestBody.service === "UPDATE") {
        // Only call the API if core card data exists for UPDATE and age is above 16 years
        if (hasAnyCoreCardData && age > 16) { 
          this.dataStorageService.generatePRN(requestBody).subscribe((response: PRNResponseModel) => {
            if (response.response != null) {
              this.PRN = response.response.data.prn;
              this.amount = response.response.data.amount;
            } else if (response.errors && Array.isArray(response.errors)) {
              const body = {
                case: "PRN-ERRORS",
                title: "PRN Error",
                message: response.errors[0].message,
              };
              this.dialog.open(DialougComponent, {
                width: "500px",
                data: body
              });
              console.error('Error:', response.errors[0].message);
            }
          }, (error) => {
            this.PRNerrorMessage = error.message || JSON.stringify(error);  
            const body = {
              case: "PRN-CONNECT-ERRORS",
              title: "PRN Connection Error",
              message: "Unable to connect to the server: " + this.PRNerrorMessage + "\n\nMake sure to pay in any Bank before proceeding to NIRA office"
            };
           // console.log(body);
            this.dialog.open(DialougComponent, {
              width: "500px",
              data: body
            });
          });
        } else {
          // Show dialog if no core card data is present for UPDATE
          const body = {
            title: "COP NO Payment",
            case: "NO-CORE-CARD-DATA",
            message: "No payement since you have not changed any core card data.\n\n OR You are below 16 to be charged for the changes "
          };
          this.dialog.open(DialougComponent, {
            width: "350px",
            data: body
          });
        }
      } else {
        // Call the API for services that are not "UPDATE"
        this.dataStorageService.generatePRN(requestBody).subscribe((response: PRNResponseModel) => {
          if (response.response != null) {
            this.PRN = response.response.data.prn;
            this.amount = response.response.data.amount;
          } else if (response.errors && Array.isArray(response.errors)) {
            const body = {
              case: "PRN-ERRORS",
              title: "PRN Error",
              message: response.errors[0].message,
            };
            this.dialog.open(DialougComponent, {
              width: "500px",
              data: body
            });
            console.error('Error:', response.errors[0].message);
          }
        }, (error) => {
          this.PRNerrorMessage = error.message || JSON.stringify(error);  
          const body = {
            case: "PRN-CONNECT-ERRORS",
            title: "PRN Connection Error",
            message: "Unable to connect to the server: " + this.PRNerrorMessage + "\n\nMake sure to pay in any Bank before proceeding to NIRA office"
          };
          console.log(body);
          this.dialog.open(DialougComponent, {
            width: "500px",
            data: body
          });
        });
      }
    } else {
      const body = {
        title: "No Required Payment",
        case: "NO-PAYMENT",
        message: "Your selected service doesn't require any payment."
      };
      this.dialog.open(DialougComponent, {
        width: "350px",
        data: body
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}
