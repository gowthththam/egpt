
import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, Input, SimpleChanges } from '@angular/core';
import { NewchartService, chartResponses, ImageResponse, Response} from 'src/app/services/newChart/newchart.service';
import { ConHistService } from 'src/app/services/convHist/con-hist.service';
import { AdminServiceService } from 'src/app/services/admin/admin-service.service';
import { ImgServiceService } from 'src/app/services/imgChat/img-service.service';
import { Label } from '@amcharts/amcharts4/core';



declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-img-hist-conv',
  templateUrl: './img-hist-conv.component.html',
  styleUrls: ['./img-hist-conv.component.css']
})
export class ImgHistConvComponent implements AfterViewInit, OnInit {
 
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('inputArea') inputArea!: ElementRef;
  @Input() conversationId!: number;
 

  tts: boolean = false;
  isRecording: boolean = false;
  recognition: any;
  utterance: SpeechSynthesisUtterance | null = null;
  isLoading: boolean = false;
  messages: Response[] = [];
  enabledLLMs: any[] = [];
  modelName: any = '';
  showDropup: boolean = false;
  firstModel: any;  
  hasError: boolean = false;
  selectedFile: File | null = null;
  loading: boolean = false;
  selectedImageUrl: string | null = null;
  filteredText: any;
  display:boolean=true;
  privacyMessage: string = '';

  constructor(
    private newchartService: NewchartService,
    private conhistService: ConHistService,
    private adminServiceService: AdminServiceService,
    private imgService: ImgServiceService,
  ) {

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
 
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.inputArea.nativeElement.value = transcript;
        console.log('Recorded text:', transcript);
        this.isRecording = false;
      };
 
      this.recognition.onerror = (event: any) => {
        console.error(event.error);
        this.isRecording = false;
      };
 
      console.log("Web Speech API is supported in this browser");
    } else {
      console.warn('Web Speech API is not supported in this browser.');
    }
  }
 

  

  ngOnInit(): void {
    this.getEnabledLLM();
  }
 
  ngAfterViewInit(): void {
    this.scrollToBottom();
  }
 
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      localStorage.setItem('currentConvId', this.conversationId.toString());
      console.log('Selected conversation ID:', this.conversationId);
 
      this.conhistService.retreiveConvById(this.conversationId).subscribe(response => {
        this.messages = response;
        setTimeout(() => this.scrollToBottom());
      });
    }
  }
 
  // Scroll chat container to the bottom
  scrollToBottom(): void {
    if (this.chatContainer?.nativeElement) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
  
  async sendMessage(): Promise<void> {
    const message = this.inputArea.nativeElement.value.trim();
    if (!message) return;
  
    this.addMessage(message, 'User', null);
    this.inputArea.nativeElement.value = '';
    this.isLoading = true;
  
    const canDisplay = await this.applyFilter(message);
  
    if (canDisplay) {
      this.imgService.getImage(message).subscribe(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          this.addMessage(null, 'Bot', reader.result as string);
          this.isLoading = false;
          this.scrollToBottom();
        };
        reader.onerror = error => {
          console.error('Error reading blob:', error);
          this.addMessage(null, 'Bot', '../../assets/error.png');
          this.isLoading = false;
          this.scrollToBottom();
        };
        reader.readAsDataURL(blob);
      }, error => {
        console.error('Error fetching image:', error);
        this.addMessage(null, 'Bot', '../../assets/error.png');
        this.isLoading = false;
        this.scrollToBottom();
      });
    } else {
      console.log("Displaying privacy/data concern message");
      this.privacyMessage = "Due to privacy and data concerns, this image cannot be displayed.";
      this.addMessage(null, 'Bot', '../../assets/privacy-data.png');
      this.isLoading = false;
      this.scrollToBottom();
    }
  }


addErrorMessage(customMessage: string): void {
  this.addMessage(customMessage, 'Bot', null);  // Show custom error message when image load fails
  this.isLoading = false;  // Set loading false on error
  this.scrollToBottom();  // Scroll to bottom to show the message
}




addMessage(message: string | null, sender: 'User' | 'Bot' | 'Assistant', imageUrl: string | null): void {
  let newMessage: Response;

  if (imageUrl) {
      newMessage = {
          id: Math.random(),
          conv_id: parseInt(localStorage.getItem('conversationId') || '9999', 10),
          msg_type: sender,
          time: new Date().toLocaleTimeString(),
          feedback: '',
          response_from: sender === 'User' ? 'User' : 'Bot',
          imageUrl: imageUrl
      } as ImageResponse;
  } else {
      newMessage = {
          id: Math.random(),
          conv_id: parseInt(localStorage.getItem('conversationId') || '9999', 10),
          msg_type: sender,
          time: new Date().toLocaleTimeString(),
          feedback: '',
          response_from: sender === 'User' ? 'User' : 'Bot',
          msg: message
      } as chartResponses;
  }

  this.messages.push(newMessage);
  setTimeout(() => this.scrollToBottom());
}



  


  
 
  // Handle successful response
  handleResponse(response: chartResponses): void {
    this.messages.push(response);
    this.isLoading = false;
    setTimeout(() => this.scrollToBottom());
  }
 
  // Handle errors during the API call
  handleError(): void {
    this.isLoading = false;
    this.messages.push({
      msg: "Oops, something went wrong",
      time: new Date().toLocaleTimeString(),
      msg_type: "assistant",
      id: 999999,
      feedback: 'neutral',
      conv_id: 999999999,
      response_from: "From frontend",
    });
    setTimeout(() => this.scrollToBottom());
  }
 
  // Enable the input area after API call
  enableInputArea(): void {
    this.inputArea.nativeElement.addEventListener('keypress', this.onKeyPress);
  }
 
  // Capture Enter key to send message
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading) {
      event.preventDefault();
      this.sendMessage();
    }
  }
 
  // Speech synthesis (TTS)
  readAloud(event: MouseEvent, message: string): void {
    if ('speechSynthesis' in window) {
      this.tts = true;
      this.utterance = new SpeechSynthesisUtterance(message);
      this.utterance.onend = () => this.tts = false;
      window.speechSynthesis.speak(this.utterance);
    } else {
      alert('Your browser does not support the Web Speech API');
    }
  }
 
 
 
  // Retrieve enabled LLMs
  getEnabledLLM(): void {

    this.enabledLLMs = ["Stable-diffusion-3.5-large", "bgbt"]
        //response;
        this.modelName = "SD-3.5-large"


    // this.adminServiceService.getEnabledLLMS().subscribe(
    //   response => {
    //     this.enabledLLMs = ["Stable-diffusion-3.5-large"]
    //     //response;
    //     this.modelName = "Stable-diffusion-3.5-large"
    //     // localStorage.getItem('selectedModel') || response[0].name;
    //   },
    //   error => console.error(error)
    // );
  }
 
 
  splitMessage(message: string): Array<{ type: string; content: string; language?: string }> {
    // Example logic to split a message into different segments
    const segments = [];
 
    // Dummy implementation (replace this with your actual logic)
    if (message.includes('```')) {
      segments.push({ type: 'code', content: 'console.log("Hello, world!");', language: 'javascript' });
    } else if (message.includes('http')) {
      segments.push({ type: 'image', content: 'https://example.com/image.png' });
    } else {
      segments.push({ type: 'text', content: message });
    }
 
    return segments;
  }
 
 
    copyHighlightMessage(event: Event, content: string): void {
      console.log('Copy highlighted message:', content);
    }
 
    likeMessage(event: Event, message: any): void {
      message.feedback = 'liked';
    }
 
    dislikeMessage(event: Event, message: any): void {
      message.feedback = 'disliked';
    }
 
    copyMessage(event: Event, message: any): void {
      console.log('Message copied:', message);
    }
 
    stopSpeaking(event: Event): void {
      console.log('Stopped speaking');
    }
 
    toggleDropup(): void {
      console.log('Toggled dropup');
    }
 
    selectModel(event: Event): void {
      console.log('Model selected:', event);
    }
 
    startRecording(): void {
      this.isRecording = true;
      console.log('Recording started');
    }
 
    stopRecording(): void {
      this.isRecording = false;
      console.log('Recording stopped');
    }
 
    
 
  // Simulate an error for testing
  simulateError() {
    this.hasError = true; // Set this to true when you want to trigger the error state
  }
 
  // Reset error state
  resetError() {
    this.hasError = false; // Reset the error state
  }

    // Add the modifyDay method
    modifyDay(dateTimeString: string): string {
      const date = new Date(dateTimeString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      };
      return date.toLocaleDateString('en-US', options);
    }

    isImageResponse(response: Response): response is ImageResponse {
      return (response as ImageResponse).imageUrl !== undefined;
  }
  setSelectedImageUrl(url: string): void {
    this.selectedImageUrl = url;
}

toggleZoom(event: MouseEvent): void {
  const imageElement = event.target as HTMLElement; // Cast the target to an HTMLElement
  imageElement.classList.toggle('zoomed-in');
}
isErrorImage(message: Response): boolean {
  if ((message as ImageResponse).imageUrl) {
    return (message as ImageResponse).imageUrl === '../../assets/error.png';
  }
  return false;
}

applyFilter(text: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    this.imgService.applyContentFilter(text).subscribe(
      (response: { label: string, score: number }[]) => {
        this.filteredText = response;
        const value = this.filteredText[0][0];
        if (value.label === 'NEGATIVE' && value.score > 0.6) {
          this.display = false;
          console.log("Image display not allowed due to content filter");
          resolve(false);
        } else {
          this.display = true;
          resolve(true);
        }
      },
      (error) => {
        console.error('Error occurred while applying content filter:', error);
        this.display = true; // Default to true if there's an error
        resolve(true);
      }
    );
  });
}


isPrivacyImage(message: Response): boolean {
  return (message as ImageResponse).imageUrl === '../../assets/privacy-data.png';
}

}
