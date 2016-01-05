/**
 * Flag client side lib
 */

(function (we) {

we.flag = {
  /**
   * Submit like or unlike form with ajax and replace old form with new form from response
   *
   */
  onSubmitLikeForm: function onSubmitLikeForm(e) {
    var url = e.target.action;
    url+= '&responseType=modal';
    var form = $(e.target);

    $.ajax({
      type: 'POST',
      url: url,
      data: form.serialize()
    }).then(function (data) {
      form.replaceWith( data.formHtml );
    }).fail(function (err){
      // TODO
      console.log('err>',err);
    });

    // avoid to execute the actual submit of the form.
    e.preventDefault();
    return false;
  }
};

$( document ).on( 'submit', 'form.like-form', we.flag.onSubmitLikeForm);
$( document ).on( 'submit', 'form.unlike-form', we.flag.onSubmitLikeForm);

$( document ).on( 'submit', 'form.follow-form', we.flag.onSubmitLikeForm);
$( document ).on( 'submit', 'form.unfollow-form', we.flag.onSubmitLikeForm);

})(window.we);