[.[] | 
{ 
  ("dmv_test_" + (.test | tostring)) : .pages | [  
  .[] | .data  | .[] | .hasPart | .[] | 
  . as $in
  | $in.acceptedAnswer[0]    as $acc
  | {
      question: $in.name,
      imgFileName:   $in.thumbnailUrl,
      options:  (
        $in.suggestedAnswer
        | map(
            { text: .text,
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
]
} ]  | add
