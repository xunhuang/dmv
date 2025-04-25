  
  .[] | .hasPart | .[] | 
  . as $in
  | $in.acceptedAnswer[0]    as $acc
  | {
      question: $in.text,
      imgFileName:   $in.thumbnailUrl,
      options:  (
        $in.suggestedAnswer
        | map(
            { answer: .text,
              isCorrect: (.position == $acc.position)
            }
            + ( if .position == $acc.position
                then { explanation: $acc.answerExplanation.text }
                else {}
              end
            )
          )
      )
    }

