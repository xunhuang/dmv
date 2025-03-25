// Mock API service to simulate backend calls
export const api = {
  getChapters: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, title: "The California Driver's License" },
          { id: 2, title: "Getting an Instruction Permit and Driver's License" },
          { id: 3, title: "The Testing Process" },
          { id: 4, title: "Changing, Replacing, and Renewing Your Driver's License" },
          { id: 5, title: "An Introduction to Driving" },
          { id: 6, title: "Navigating the Roads" },
          { id: 7, title: "Laws and Rules of the Road" },
          { id: 8, title: "Safe Driving" },
          { id: 9, title: "Alcohol and Drugs" },
          { id: 10, title: "Financial Responsibility, Insurance Requirements, and Collisions" },
          { id: 11, title: "Vehicle Registration Requirements" },
          { id: 12, title: "Driver Safety" },
          { id: 13, title: "Seniors and Driving" }
        ]);
      }, 300);
    });
  },

  getQuestionsByChapter: (chapterId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockQuestionsByChapter[chapterId]);
      }, 500);
    });
  }
};

// Mock questions data
export const mockQuestionsByChapter = {
  1: [
    {
      question: "What does a California driver's license allow you to do?",
      options: [
        { text: "Drive on public roads with the correct license for your vehicle", isCorrect: true },
        { text: "Drive any vehicle regardless of class", isCorrect: false, explanation: "You must have the correct license for the specific type of vehicle you're driving." },
        { text: "Drive on private roads only", isCorrect: false, explanation: "A California driver's license allows you to drive on public roads, not just private ones." },
        { text: "Drive only during daylight hours", isCorrect: false, explanation: "A standard driver's license doesn't restrict driving to daylight hours only." }
      ]
    },
    {
      question: "When will you need a REAL ID compliant driver's license?",
      options: [
        { text: "Beginning May 2025 to board domestic flights or enter federal facilities", isCorrect: true },
        { text: "Only when traveling internationally", isCorrect: false, explanation: "REAL ID is for domestic flights and entering federal facilities, not international travel." },
        { text: "Beginning January 2024 for all driving purposes", isCorrect: false, explanation: "A REAL ID is not required for driving, only for boarding domestic flights and entering federal facilities." },
        { text: "Only when driving commercial vehicles", isCorrect: false, explanation: "A REAL ID is not specifically for commercial driving." }
      ]
    },
    {
      question: "What type of card is issued for identification purposes to eligible persons of any age?",
      options: [
        { text: "ID card", isCorrect: true },
        { text: "Driver's license", isCorrect: false, explanation: "A driver's license permits you to drive, while an ID card is for identification only." },
        { text: "REAL ID card", isCorrect: false, explanation: "While a REAL ID can be either a driver's license or ID card, not all ID cards are REAL ID compliant." },
        { text: "Veteran designation card", isCorrect: false, explanation: "A Veteran designation is a feature that can be added to a driver's license or ID card, not a separate type of card." }
      ]
    }
  ],
  2: [
    {
      question: "What must you provide when applying for an instruction permit or driver's license?",
      options: [
        { text: "Proof of identity, two proofs of residency, legal full name document, and social security number", isCorrect: true },
        { text: "Only proof of identity and age", isCorrect: false, explanation: "You also need to provide proof of residency, legal full name document, and social security number." },
        { text: "Only a birth certificate and passport", isCorrect: false, explanation: "While these might satisfy some requirements, you also need proof of residency and social security number." },
        { text: "Only a previous driver's license from another state", isCorrect: false, explanation: "Even with a driver's license from another state, you still need to provide proof of identity, residency, and social security number." }
      ]
    },
    {
      question: "If you are under 18 years old, what additional requirements must you meet to get an instruction permit?",
      options: [
        { text: "Be at least 15½ years old, complete driver education, and have parent/guardian signature", isCorrect: true },
        { text: "Be at least 16 years old and pass a drug test", isCorrect: false, explanation: "You can get an instruction permit at 15½, and a drug test is not required." },
        { text: "Only need to pass the vision and knowledge tests", isCorrect: false, explanation: "Minors also need to complete driver education and have parent/guardian approval." },
        { text: "Be at least 17 years old with proof of employment", isCorrect: false, explanation: "You can get an instruction permit at 15½, and proof of employment is not required." }
      ]
    },
    {
      question: "What restriction applies to provisional drivers under 18 during the first 12 months?",
      options: [
        { text: "Cannot drive between 11 p.m. and 5 a.m.", isCorrect: true },
        { text: "Cannot drive on freeways", isCorrect: false, explanation: "Provisional drivers are allowed to drive on freeways." },
        { text: "Cannot drive more than 25 miles from home", isCorrect: false, explanation: "There is no mileage restriction for provisional drivers." },
        { text: "Cannot drive without a parent at any time", isCorrect: false, explanation: "Provisional drivers can drive without parents, but with restrictions on passengers and hours." }
      ]
    }
  ],
  3: [
    {
      question: "How many attempts are you allowed to pass the knowledge test before you must reapply?",
      options: [
        { text: "Three attempts", isCorrect: true },
        { text: "One attempt", isCorrect: false, explanation: "You are allowed three attempts to pass the knowledge test, not just one." },
        { text: "Five attempts", isCorrect: false, explanation: "You are allowed three attempts, not five, before you must reapply." },
        { text: "Unlimited attempts", isCorrect: false, explanation: "You are limited to three attempts before you must reapply." }
      ]
    },
    {
      question: "What must you bring to your behind-the-wheel drive test?",
      options: [
        { text: "Your instruction permit/license, a licensed driver, a safe vehicle, and proof of insurance and registration", isCorrect: true },
        { text: "Only your instruction permit", isCorrect: false, explanation: "You also need a licensed driver, a safe vehicle, and proof of insurance and registration." },
        { text: "Only a safe vehicle", isCorrect: false, explanation: "You also need your instruction permit/license, a licensed driver, and proof of insurance and registration." },
        { text: "Only proof of insurance", isCorrect: false, explanation: "You also need your instruction permit/license, a licensed driver, a safe vehicle, and registration." }
      ]
    },
    {
      question: "How many days must minors wait to retake a failed behind-the-wheel drive test?",
      options: [
        { text: "14 days", isCorrect: true },
        { text: "7 days", isCorrect: false, explanation: "Minors must wait 14 days to retake a failed behind-the-wheel test, not 7 days." },
        { text: "30 days", isCorrect: false, explanation: "Minors must wait 14 days, not 30 days, to retake a failed behind-the-wheel test." },
        { text: "No waiting period", isCorrect: false, explanation: "There is a 14-day waiting period for minors to retake a failed behind-the-wheel test." }
      ]
    }
  ],
  4: [
    {
      question: "How many days do you have to notify DMV of your new address if you move?",
      options: [
        { text: "10 days", isCorrect: true },
        { text: "30 days", isCorrect: false, explanation: "You must notify DMV within 10 days, not 30 days, when you move." },
        { text: "60 days", isCorrect: false, explanation: "You must notify DMV within 10 days, not 60 days, when you move." },
        { text: "No need to notify until renewal", isCorrect: false, explanation: "You must notify DMV within 10 days when you move, not wait until renewal." }
      ]
    },
    {
      question: "What can you request if you are out-of-state and cannot renew your driver's license?",
      options: [
        { text: "A one-year extension of your driver's license", isCorrect: true },
        { text: "An indefinite extension", isCorrect: false, explanation: "You can only request a one-year extension, not an indefinite one." },
        { text: "A temporary license valid in other states only", isCorrect: false, explanation: "The extension is for your California license, not a separate temporary license." },
        { text: "A refund of your license fees", isCorrect: false, explanation: "Being out-of-state does not qualify you for a refund of license fees." }
      ]
    },
    {
      question: "What happens to your current driver's license when you receive a replacement for a lost, stolen, or damaged license?",
      options: [
        { text: "It is no longer valid and should be destroyed if found", isCorrect: true },
        { text: "It remains valid as a secondary form of ID", isCorrect: false, explanation: "Once replaced, your old license is no longer valid for any purpose." },
        { text: "It can be used until the expiration date", isCorrect: false, explanation: "Once replaced, your old license is immediately invalid, regardless of the expiration date." },
        { text: "It can be used outside of California only", isCorrect: false, explanation: "Once replaced, your old license is not valid anywhere." }
      ]
    }
  ],
  5: [
    {
      question: "When starting with hand-to-hand steering, where should your hands be positioned?",
      options: [
        { text: "At 9 and 3 o'clock or 8 and 4 o'clock", isCorrect: true },
        { text: "At 10 and 2 o'clock", isCorrect: false, explanation: "The recommended positions are 9 and 3 o'clock or 8 and 4 o'clock, not 10 and 2." },
        { text: "Only at 12 o'clock", isCorrect: false, explanation: "This position doesn't provide enough control of the vehicle." },
        { text: "Anywhere that feels comfortable", isCorrect: false, explanation: "Specific hand positions are recommended for optimal control and safety." }
      ]
    },
    {
      question: "How far ahead should you signal before making a turn?",
      options: [
        { text: "At least 100 feet", isCorrect: true },
        { text: "At least 50 feet", isCorrect: false, explanation: "You should signal at least 100 feet before turning, not just 50 feet." },
        { text: "At least 500 feet", isCorrect: false, explanation: "The requirement is at least 100 feet, not 500 feet." },
        { text: "Only when you start turning", isCorrect: false, explanation: "You should signal well before turning, not just when you start the turn." }
      ]
    },
    {
      question: "When should you dim your high-beam headlights to low beams?",
      options: [
        { text: "Within 500 feet of an oncoming vehicle or 300 feet of a vehicle you're following", isCorrect: true },
        { text: "Only when driving in fog", isCorrect: false, explanation: "You should use low beams in fog, but also when near other vehicles." },
        { text: "Only when driving in city areas", isCorrect: false, explanation: "The requirement is based on distance from other vehicles, not location." },
        { text: "Only when another driver flashes their lights at you", isCorrect: false, explanation: "You should dim your lights based on distance, not wait for other drivers to signal you." }
      ]
    }
  ],
  6: [
    {
      question: "What does a double solid yellow line in the middle of the road mean?",
      options: [
        { text: "Do not pass over these lines except in specific situations like turning left", isCorrect: true },
        { text: "You can pass whenever it's safe", isCorrect: false, explanation: "Double solid yellow lines indicate no passing except in specific situations." },
        { text: "You can never cross these lines under any circumstances", isCorrect: false, explanation: "You can cross double solid yellow lines in certain situations, such as turning left into a driveway." },
        { text: "These lines are only suggestions", isCorrect: false, explanation: "Double solid yellow lines are regulatory markings, not suggestions." }
      ]
    },
    {
      question: "How far ahead of the intersection can you drive in a bicycle lane before making a right turn?",
      options: [
        { text: "Within 200 feet", isCorrect: true },
        { text: "Within 100 feet", isCorrect: false, explanation: "You can drive in a bicycle lane within 200 feet, not just 100 feet, before turning right." },
        { text: "Within 500 feet", isCorrect: false, explanation: "You can only drive in a bicycle lane within 200 feet, not 500 feet, before turning right." },
        { text: "You should never drive in a bicycle lane", isCorrect: false, explanation: "You can drive in a bicycle lane within 200 feet before turning right." }
      ]
    },
    {
      question: "When making a U-turn, where is it illegal to do so?",
      options: [
        { text: "On a railroad crossing", isCorrect: true },
        { text: "At an intersection with a green light", isCorrect: false, explanation: "U-turns are generally allowed at intersections with green lights unless prohibited by signs." },
        { text: "In a residential district", isCorrect: false, explanation: "U-turns are allowed in residential districts if no vehicles are approaching within 200 feet." },
        { text: "Across a double yellow line", isCorrect: false, explanation: "U-turns across double yellow lines are permitted when legal to make a U-turn." }
      ]
    }
  ],
  7: [
    {
      question: "What should you do at a flashing red traffic signal light?",
      options: [
        { text: "Stop, then proceed when it is safe", isCorrect: true },
        { text: "Slow down but do not stop", isCorrect: false, explanation: "A flashing red light requires a full stop before proceeding." },
        { text: "Stop and wait for the light to change", isCorrect: false, explanation: "At a flashing red light, you stop and then proceed when safe, not wait for it to change." },
        { text: "Treat it like a yield sign", isCorrect: false, explanation: "A flashing red light requires a full stop, not just yielding." }
      ]
    },
    {
      question: "What is the right-of-way rule at an intersection without STOP or YIELD signs?",
      options: [
        { text: "The vehicle that arrives first has the right-of-way; if simultaneous, yield to the vehicle on your right", isCorrect: true },
        { text: "Always yield to the vehicle on your left", isCorrect: false, explanation: "If vehicles arrive simultaneously, you yield to the vehicle on your right, not left." },
        { text: "The larger vehicle always has the right-of-way", isCorrect: false, explanation: "Vehicle size does not determine right-of-way at intersections." },
        { text: "The vehicle traveling faster has the right-of-way", isCorrect: false, explanation: "Speed does not determine right-of-way at intersections." }
      ]
    },
    {
      question: "What is the speed limit in a business or residential district unless otherwise posted?",
      options: [
        { text: "25 mph", isCorrect: true },
        { text: "35 mph", isCorrect: false, explanation: "The speed limit in business or residential districts is 25 mph, not 35 mph, unless otherwise posted." },
        { text: "15 mph", isCorrect: false, explanation: "The speed limit in business or residential districts is 25 mph, not 15 mph, unless otherwise posted." },
        { text: "55 mph", isCorrect: false, explanation: "The speed limit in business or residential districts is 25 mph, not 55 mph, unless otherwise posted." }
      ]
    }
  ],
  8: [
    {
      question: "What is the three-second rule used for?",
      options: [
        { text: "To ensure a safe following distance between vehicles", isCorrect: true },
        { text: "To determine how long to signal before turning", isCorrect: false, explanation: "The three-second rule is for following distance, not signaling time." },
        { text: "To measure reaction time at traffic lights", isCorrect: false, explanation: "The three-second rule is for maintaining a safe following distance between vehicles." },
        { text: "To time how long to look in each direction at an intersection", isCorrect: false, explanation: "The three-second rule is about following distance, not intersection scanning." }
      ]
    },
    {
      question: "What should you do if you experience hydroplaning?",
      options: [
        { text: "Slow down gradually without using the brakes", isCorrect: true },
        { text: "Brake hard immediately", isCorrect: false, explanation: "Sudden braking during hydroplaning can cause you to lose control." },
        { text: "Accelerate to drive through the water faster", isCorrect: false, explanation: "Accelerating during hydroplaning can worsen the situation and cause a loss of control." },
        { text: "Turn the steering wheel quickly in the opposite direction", isCorrect: false, explanation: "Quick steering movements during hydroplaning can cause you to lose control." }
      ]
    },
    {
      question: "What should you do if your tire blows out while driving?",
      options: [
        { text: "Hold the steering wheel firmly, maintain speed if possible, and gradually release the accelerator", isCorrect: true },
        { text: "Brake hard immediately", isCorrect: false, explanation: "Sudden braking after a tire blowout can cause you to lose control." },
        { text: "Let go of the steering wheel", isCorrect: false, explanation: "You should hold the steering wheel firmly to maintain control of the vehicle." },
        { text: "Accelerate to maintain balance", isCorrect: false, explanation: "Accelerating with a blown tire can cause further loss of control." }
      ]
    }
  ],
  9: [
    {
      question: "What is the blood alcohol concentration (BAC) limit for drivers 21 years old and over?",
      options: [
        { text: "0.08%", isCorrect: true },
        { text: "0.05%", isCorrect: false, explanation: "The BAC limit for drivers 21 and over is 0.08%, not 0.05%." },
        { text: "0.10%", isCorrect: false, explanation: "The BAC limit for drivers 21 and over is 0.08%, not 0.10%." },
        { text: "Any detectable amount", isCorrect: false, explanation: "For drivers 21 and over, the limit is 0.08%, not any detectable amount." }
      ]
    },
    {
      question: "What is the BAC limit for drivers under 21 years old?",
      options: [
        { text: "0.01%", isCorrect: true },
        { text: "0.05%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.05%." },
        { text: "0.08%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.08% (which is the limit for drivers 21 and over)." },
        { text: "0.04%", isCorrect: false, explanation: "The BAC limit for drivers under 21 is 0.01%, not 0.04%." }
      ]
    },
    {
      question: "If you are convicted of a DUI, how long will it remain on your driver's record?",
      options: [
        { text: "10 years", isCorrect: true },
        { text: "3 years", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not 3 years." },
        { text: "7 years", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not 7 years." },
        { text: "Forever", isCorrect: false, explanation: "DUI convictions remain on your record for 10 years, not permanently." }
      ]
    }
  ],
  10: [
    {
      question: "What is the minimum liability insurance coverage required for property damage in California?",
      options: [
        { text: "$5,000", isCorrect: true },
        { text: "$10,000", isCorrect: false, explanation: "The minimum required property damage coverage is $5,000, not $10,000." },
        { text: "$15,000", isCorrect: false, explanation: "The minimum required property damage coverage is $5,000, not $15,000." },
        { text: "$25,000", isCorrect: false, explanation: "The minimum required property damage coverage is $5,000, not $25,000." }
      ]
    },
    {
      question: "After a collision, how many days do you have to report it to DMV if there was more than $1,000 in property damage or if anyone was injured?",
      options: [
        { text: "10 days", isCorrect: true },
        { text: "30 days", isCorrect: false, explanation: "You must report the collision to DMV within 10 days, not 30 days." },
        { text: "5 days", isCorrect: false, explanation: "You must report the collision to DMV within 10 days, not 5 days." },
        { text: "Only if law enforcement requests it", isCorrect: false, explanation: "You must report the collision to DMV within 10 days, regardless of law enforcement involvement." }
      ]
    },
    {
      question: "What can happen to your driving privilege if you are in a collision and don't have proper insurance coverage?",
      options: [
        { text: "It can be suspended for up to four years", isCorrect: true },
        { text: "It can be suspended for 30 days", isCorrect: false, explanation: "Your driving privilege can be suspended for up to four years, not just 30 days." },
        { text: "You'll receive a warning letter", isCorrect: false, explanation: "Your driving privilege can be suspended for up to four years, not just receive a warning." },
        { text: "Nothing, if you weren't at fault", isCorrect: false, explanation: "Your driving privilege can be suspended regardless of who was at fault if you don't have proper insurance." }
      ]
    }
  ],
  11: [
    {
      question: "How many days do you have to transfer ownership to your name after buying a vehicle?",
      options: [
        { text: "10 days", isCorrect: true },
        { text: "30 days", isCorrect: false, explanation: "You have 10 days, not 30 days, to transfer ownership after buying a vehicle." },
        { text: "5 days", isCorrect: false, explanation: "You have 10 days, not 5 days, to transfer ownership after buying a vehicle." },
        { text: "15 days", isCorrect: false, explanation: "You have 10 days, not 15 days, to transfer ownership after buying a vehicle." }
      ]
    },
    {
      question: "After selling a vehicle, how many days do you have to notify DMV?",
      options: [
        { text: "5 days", isCorrect: true },
        { text: "10 days", isCorrect: false, explanation: "You have 5 days, not 10 days, to notify DMV after selling a vehicle." },
        { text: "30 days", isCorrect: false, explanation: "You have 5 days, not 30 days, to notify DMV after selling a vehicle." },
        { text: "No notification is required", isCorrect: false, explanation: "You must notify DMV within 5 days after selling a vehicle." }
      ]
    },
    {
      question: "How many days do you have to register your vehicle after becoming a resident or getting a job in California?",
      options: [
        { text: "20 days", isCorrect: true },
        { text: "10 days", isCorrect: false, explanation: "You have 20 days, not 10 days, to register your vehicle after becoming a resident." },
        { text: "30 days", isCorrect: false, explanation: "You have 20 days, not 30 days, to register your vehicle after becoming a resident." },
        { text: "6 months", isCorrect: false, explanation: "You have 20 days, not 6 months, to register your vehicle after becoming a resident." }
      ]
    }
  ],
  12: [
    {
      question: "What action can DMV take after a reexamination of a driver?",
      options: [
        { text: "Issue a limited term driver's license", isCorrect: true },
        { text: "Only revoke a driver's license", isCorrect: false, explanation: "DMV has several options beyond just revocation, including issuing a limited term license." },
        { text: "Only issue warnings", isCorrect: false, explanation: "DMV can take more substantial actions than just warnings, including license restrictions or suspension." },
        { text: "Only require new photographs", isCorrect: false, explanation: "DMV's actions after reexamination relate to driving privileges, not just administrative updates." }
      ]
    },
    {
      question: "What happens if you receive a Notice of Priority Reexamination and don't contact DMV within five working days?",
      options: [
        { text: "Your driving privilege will be automatically suspended", isCorrect: true },
        { text: "You'll receive a warning letter", isCorrect: false, explanation: "Your driving privilege will be automatically suspended, not just receive a warning." },
        { text: "You'll be scheduled for a mandatory court appearance", isCorrect: false, explanation: "Your driving privilege will be automatically suspended; there's no mandatory court appearance." },
        { text: "Nothing, the notice expires", isCorrect: false, explanation: "Your driving privilege will be automatically suspended if you ignore the notice." }
      ]
    },
    {
      question: "What are restrictions that DMV might place on a driver's license?",
      options: [
        { text: "Limiting when and where a person may drive", isCorrect: true },
        { text: "Only allowing driving for work purposes", isCorrect: false, explanation: "While work-only restrictions exist in some contexts, the handbook specifically mentions limiting when and where a person may drive." },
        { text: "Only allowing driving with a licensed driver present", isCorrect: false, explanation: "This is a provisional license restriction for minors, not a typical DMV restriction for medical or safety concerns." },
        { text: "Only allowing driving vehicles made after 2010", isCorrect: false, explanation: "DMV restrictions typically don't specify vehicle age requirements." }
      ]
    }
  ],
  13: [
    {
      question: "What is the Mature Driver Improvement Program?",
      options: [
        { text: "An eight-hour course for drivers 55 years old and older", isCorrect: true },
        { text: "A mandatory annual driving test for seniors", isCorrect: false, explanation: "The program is an optional course, not a mandatory driving test." },
        { text: "A program that restricts senior drivers to daytime driving only", isCorrect: false, explanation: "The program is educational and doesn't automatically impose driving restrictions." },
        { text: "A mandatory medical examination for drivers over 65", isCorrect: false, explanation: "The program is an educational course, not a medical examination requirement." }
      ]
    },
    {
      question: "If you are 70 years old or older at the time your driver's license expires, how must you renew it?",
      options: [
        { text: "In person, completing a vision test", isCorrect: true },
        { text: "Online only", isCorrect: false, explanation: "Drivers 70 and older must renew in person, not online." },
        { text: "By mail with a doctor's note", isCorrect: false, explanation: "Renewal requires an in-person visit with a vision test, not just a doctor's note by mail." },
        { text: "Through a mandatory driving test", isCorrect: false, explanation: "While a knowledge test may be required, a driving test is not automatically required for age-based renewal." }
      ]
    },
    {
      question: "What is a warning sign that a senior may no longer be a safe driver?",
      options: [
        { text: "Getting lost in familiar places", isCorrect: true },
        { text: "Needing glasses to drive", isCorrect: false, explanation: "Many safe drivers of all ages need glasses to drive." },
        { text: "Driving slower than the maximum speed limit", isCorrect: false, explanation: "Driving at a safe speed, even below the maximum limit, is not necessarily unsafe." },
        { text: "Preferring daytime driving over nighttime driving", isCorrect: false, explanation: "Many safe drivers of all ages prefer daytime driving." }
      ]
    }
  ]
};