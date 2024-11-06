export class NotificationDtoModelv2 {
    constructor(
      public name: string,
      public preRegistrationId: string,
      //malay
      public appointmentDate: string,
      public appointmentTime: string,
      public mobNum: string,
      public emailID: string,
      public additionalRecipient: boolean,
      public isBatch: boolean,
      public userService: string
    ) {}
  }
  