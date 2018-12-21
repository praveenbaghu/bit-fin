import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { WalletService } from './../services/wallet.service';
// import { StripeService, Elements, Element as StripeElement, ElementsOptions } from "ngx-stripe";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { ProfileService } from './../services/profile.service';
import { CryptoService } from './../services/crypto.service';
import { ToastrService } from 'ngx-toastr';

// import { StripeInstance, StripeFactoryService } from "ngx-stripe";

import { StripeService, StripeCardComponent, ElementOptions, ElementsOptions } from "ngx-stripe";

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent implements OnInit {
  yourMobileNumber: any;
  savedCards: any;
  receiverMobileNumber: any;
  autocompleteNumbers: any;
  availableBalance: any;
  selectedReceiver: any;
  amountToSend: any = 0;
  feePercentage: any = 0.1;
  adminDetails: any;
  usd_xlm_conversion: any = 0;
  xlm_Usd_conversion: any = 0;
  userDetails: any;
  withdraw: any = {};
  withdrawBankDetails: any;

  //send
  sendTransactionTotal: any = 0;
  sendTransactionFee: any = 0;
  sendWalletAmount_USD: any = 0;
  sendWalletFee_USD: any = 0;
  waitingForResponse: boolean = false;

  //withdraw
  amountToWithdraw: any = 0;
  withdrawTransactionFee: any = 0;
  withdrawAmount_xlm: any = 0;
  withdrawRate: any = 0
  withdrawFee: any = 0;
  selectedWithdrawAccount: any;

  //deposit
  amountToDeposit: any = 0;
  uploadVerificationImage: any;

  @ViewChild(StripeCardComponent) card: StripeCardComponent;

  cardOptions: ElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        lineHeight: '40px',
        fontWeight: 300,
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0'
        }
      }
    }
  };

  elementsOptions: ElementsOptions = {
    locale: 'en'
  };

  stripeTest: FormGroup;

  constructor(public toastr: ToastrService, private walletService: WalletService, private fb: FormBuilder, private stripeService: StripeService, private profileService: ProfileService, private cryptoService: CryptoService) { }

  ngOnInit() {

    this.withdraw.saveDetails = true;
    this.withdraw.routingNumber = '110000000';
    this.withdraw.accountNumber = '000123456789';
    this.withdraw.accountHolder = 'Jenny';
    this.withdraw.postalCode = '10001';

    this.profileService.getBalance().subscribe(data => {
      this.availableBalance = data;
    }, err => {
      this.toastr.error('Failed to get user balance data', 'Error!');
    });

    this.profileService.getUserDetails().subscribe(data => {
      this.userDetails = data;
      this.yourMobileNumber = this.userDetails.mobile_number;
    }, err => {
      this.toastr.error('Failed to get user details', 'Error!');
    });


    this.walletService.getAdminDetails().subscribe(data => {
      this.adminDetails = data;
    }, err => {
      this.toastr.error('Failed to get Admin details', 'Error!');
    })

    this.cryptoService.getUsdToXlm().subscribe(data => {
      this.usd_xlm_conversion = data;
      this.usd_xlm_conversion = this.usd_xlm_conversion.XLM;
    }, err => {
      this.toastr.error('Failed to get usd to xlm conversion details', 'Error!');
    })

    this.cryptoService.getXlmToUsd().subscribe(data => {
      this.xlm_Usd_conversion = data;
      this.xlm_Usd_conversion = this.xlm_Usd_conversion.USD;
    }, err => {
      this.toastr.error('Failed to get xlm to usd conversion details', 'Error!');
    })

    this.walletService.userSavedCardDetails().subscribe(data => {
      this.savedCards = data;
    }, err => {
      this.toastr.error('Failed to saved card details', 'Error!');
    })

    this.walletService.savedWithdrawBankDetails().subscribe(data => {
      this.withdrawBankDetails = data;
    }, err => {
      this.toastr.error('Failed to get ', 'Error!');
    })

    this.stripeTest = this.fb.group({
      name: ['', [Validators.required]]
    });
  }

  createStripeToken() {
    const name = this.stripeTest.get('name').value;
    this.stripeService
      .createToken(this.card.getCard(), { name })
      .subscribe(result => {
        if (result.token) {
          if (this.amountToDeposit) {
            let data = {
              "stripeToken": result.token.id,
              "amount": this.amountToDeposit.toFixed(2),
              "user": localStorage.getItem('userId'),
              "xlmAmount": (this.amountToDeposit * this.usd_xlm_conversion).toFixed(2),
              "card": {
                "number": "4242424242424242",
                "holder": result.token.card.name,
                "expiry": result.token.card.exp_month.toString() + '-' + result.token.card.exp_year.toString(),
                "user": localStorage.getItem('userId'),
              }
            }
            this.walletService.depositAmount(data).subscribe(data => {
              this.toastr.success('Deposit amount successfully');
              this.ngOnInit()
            }, err => {
              this.toastr.error('Failed to deposit amount', 'Error!');
            })
          } else {
            this.toastr.error('Please enter deposit amount', 'Error!');
          }
        } else if (result.error) {
          this.toastr.error('Invalid card details', 'Error!');
        }
      });
  }

  selectedCard(card) {
    this.savedCards.forEach(element => {
      element.selected = false;
    });
    card.selected = true;
  }

  getAutocompleteMobileNumbers() {
    this.walletService.autocompleteMobileNumber(this.receiverMobileNumber).subscribe((data) => {
      this.autocompleteNumbers = data;
    }, err => {
      this.toastr.error('Failed to mobile number for autocomplete', 'Error!');
    })
  }

  selectedMobileNumber(data) {
    this.selectedReceiver = data;
    this.receiverMobileNumber = this.selectedReceiver.mobile_number;
    this.autocompleteNumbers = [];
  }

  calculateSendFee() {

    let xlmAmount = parseFloat(this.amountToSend) * parseFloat(this.usd_xlm_conversion);
    this.sendTransactionTotal = xlmAmount + ((xlmAmount * this.adminDetails.sendTransactionFee) / 100);
    this.sendTransactionFee = (xlmAmount * this.adminDetails.sendTransactionFee) / 100

    this.sendWalletAmount_USD = this.sendTransactionTotal * parseFloat(this.xlm_Usd_conversion);
    this.sendWalletFee_USD = this.sendTransactionFee * parseFloat(this.xlm_Usd_conversion);

    this.sendTransactionTotal = this.sendTransactionTotal.toFixed(2);
    this.sendTransactionFee = this.sendTransactionFee.toFixed(2);

    this.sendWalletAmount_USD = this.sendWalletAmount_USD.toFixed(2);
    this.sendWalletFee_USD = this.sendWalletFee_USD.toFixed(2);


  }

  sendAmount() {

    let data = {
      "sender": localStorage.getItem('userId'),
      "receiver": this.selectedReceiver ? this.selectedReceiver._id : null,
      "amount": this.sendTransactionTotal,
      "fee": this.sendTransactionFee,
      "walletAmount": this.sendWalletAmount_USD,
      "walletFee": this.sendWalletFee_USD
    }

    if (data.sender == data.receiver) {
      this.toastr.error('Sender and Receiver cannot be same', 'Error!');
    } else if (data.sender && data.receiver && data.amount && data.fee && data.walletAmount && data.walletFee) {
      this.amountToSend = null;
      this.waitingForResponse = true;
      this.walletService.makePayment(data).subscribe(data => {
        this.waitingForResponse = false;
        this.sendWalletAmount_USD = null;
        this.sendWalletFee_USD = null;
        this.ngOnInit();
        this.toastr.success('Payment sent successfully');
      }, err => {
        this.waitingForResponse = false;
        this.toastr.error('Error while sending payment', 'Error!');
      })
    } else {
      this.toastr.error('Some fields are missing', 'Error!');
    }
  }


  //withdraw
  selectedWithdrawBankDetails(bankData) {
    this.withdrawBankDetails.forEach(element => {
      element.selected = false;
    });

    bankData.selected = true;
    this.selectedWithdrawAccount = bankData;
  }

  withdrawProof($event) {

    let file = $event.target.files[0];
    const myReader: FileReader = new FileReader();
    myReader.onloadend = (loadEvent: any) => {
      let image = loadEvent.target.result.split('base64,')[1];
      this.profileService.uploadImage({ 'image': image }).subscribe(data => {
        this.uploadVerificationImage = data;
        if (this.uploadVerificationImage) {
          this.withdraw.verificationFile = this.uploadVerificationImage.url;
        }
      }, err => {
        this.toastr.error('Error while uploading image', 'Error!');
      })
    };
    myReader.readAsDataURL(file);
  }

  calculateWithdrawFee() {
    this.withdrawAmount_xlm = parseFloat(this.amountToWithdraw) * parseFloat(this.usd_xlm_conversion);
    this.withdrawRate = (this.withdrawAmount_xlm * parseFloat(this.adminDetails.sellRate)) / 100;
    var updatedAmount = this.withdrawAmount_xlm + this.withdrawRate;
    this.withdrawFee = (updatedAmount * parseFloat(this.adminDetails.sellTransactionFee)) / 100;
    this.withdrawTransactionFee = (this.withdrawRate + this.withdrawFee) * parseFloat(this.xlm_Usd_conversion);
  }

  withdrawToSelectedAccount() {

    this.selectedWithdrawAccount.usd = this.amountToWithdraw.toFixed(2);
    this.selectedWithdrawAccount.xlm = this.withdrawAmount_xlm.toFixed(2)
    this.selectedWithdrawAccount.fee = this.withdrawFee.toFixed(2);
    this.selectedWithdrawAccount.rate = this.withdrawRate.toFixed(2);
    this.selectedWithdrawAccount.walletFee = this.withdrawTransactionFee.toFixed(2);

    this.waitingForResponse = true;
    this.walletService.withdrawFromAccount(this.selectedWithdrawAccount).subscribe(data => {
      this.waitingForResponse = false;
      this.amountToWithdraw = null;
      this.toastr.success('Withdraw amount successfully');
      this.ngOnInit();
    }, err => {
      this.waitingForResponse = false;
      this.toastr.error('Error while withdraw amount', 'Error!');
      console.log(err);
    })

  }

  withdrawToNewAmount() {

    if (this.amountToWithdraw && this.withdraw.routingNumber && this.withdraw.accountNumber && this.withdraw.phoneNumber
      && this.withdraw.accountHolder) {

      this.withdraw.day = new Date(this.withdraw.dob.toString()).getDate();
      this.withdraw.month = new Date(this.withdraw.dob.toString()).getMonth() + 1;
      this.withdraw.year = new Date(this.withdraw.dob.toString()).getFullYear();

      this.withdraw.day = this.withdraw.day.toString();
      this.withdraw.accountNumber = this.withdraw.accountNumber.toString();
      this.withdraw.month = this.withdraw.month.toString();
      this.withdraw.phoneNumber = this.withdraw.phoneNumber.toString();
      this.withdraw.saveDetails = this.withdraw.saveDetails.toString();
      this.withdraw.ssn = this.withdraw.ssn.toString();
      this.withdraw.year = this.withdraw.year.toString();

      this.withdraw.usd = this.amountToWithdraw.toFixed(2);
      this.withdraw.xlm = this.withdrawAmount_xlm.toFixed(2)
      this.withdraw.fee = this.withdrawFee.toFixed(2);
      this.withdraw.rate = this.withdrawRate.toFixed(2);
      this.withdraw.walletFee = this.withdrawTransactionFee.toFixed(2);


      this.waitingForResponse = true;
      this.walletService.withdrawFromAccount(this.withdraw).subscribe(data => {
        this.amountToWithdraw = null;
        this.toastr.success('Withdraw amount successfully');
        this.ngOnInit()
        this.waitingForResponse = false;
      }, err => {
        this.waitingForResponse = false;
        this.toastr.error('Error while withdraw amount', 'Error!');
      })
    } else {
      this.toastr.error('Some fileds are missing', 'Error!');
    }

  }

}
