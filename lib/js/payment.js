				
function formatAmount(amount) {
	var strAmount = amount.toString().split(".");
	var decimalPlaces = strAmount[1] === undefined ? 0: strAmount[1].length;
	var formattedAmount = strAmount[0];
	
	if (decimalPlaces === 0) {
		formattedAmount += '00';
	
	} else if (decimalPlaces === 1) {
		formattedAmount += strAmount[1] + '0';
	
	} else if (decimalPlaces === 2) {
		formattedAmount += strAmount[1];
	}
	
	return formattedAmount;
}

/***
* Show trusted confirmation for mobile payments
**/
function showMobilePayment () {
	var mobilePaymentDivOverlay = $('<div>', {
	   id:  'spMobilePaymentOverlay'
	})
	.css({
		'width':'100%',
		'height':'100%',
		'position': 'fixed',
		'left': 0,
		'top': 0,
		'zIndex': 99998,
		'overflow': 'hidden',
		'background': 'rgba(0, 0, 0, 0.6)'
	})
	.appendTo('body');

	var mobilePaymentDiv = $('<div>')
	.css({
		'position': 'fixed',
		'left': '4%',
		'top': '4%',
		'width':'92%',
		'height':'auto',
		'padding': '5% 0',
		'border-radius': '5px',
		'background': '#bc75f3 ',
		'overflow': 'hidden'
	})
	.appendTo(mobilePaymentDivOverlay);
	
	$('<h2>')
	.css({
		'font-family': "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
		'font-size': '22px',
		'width':'100%',
		'text-align':'center',
		'float': 'left',
		'color': '#f8f8f8'
	})
	.html('Proceed to mobile payment?')
	.appendTo(mobilePaymentDiv);

	$('<button>', {
	   id:  'spProceedToMobilePayment'
	})
	.css({
		'width':'80%',
		'border-radius': '5px',
		'border': 'none',
		'margin': '26px 0 0 10%',
		'font-size': '17px',
		'font-weight': '500',
		'color': '#f8f8f8',
		'background': '#89d78f',	
		'cursor': 'pointer',
		'outline': 'none'
	})
	.html('Ok')
	.appendTo(mobilePaymentDiv);

	$('<button>', {
	   id:  'spCancelMobilePayment'
	})
	.css({
		'width':'80%',
		'border-radius': '5px',
		'border': 'none',
		'margin': '10px 0 0 10%',
		'font-size': '17px',
		'font-weight': '500',
		'color': '#f8f8f8',
		'background': '#f27d72',	
		'cursor': 'pointer',
		'outline': 'none'
	})
	.html('Close')
	.appendTo(mobilePaymentDiv);
}

jQuery(document).ready( function($) {
	$('body').on('click', 'input[name="woocommerce_checkout_place_order"]', function (e) {
		// Hide simplepay_transaction_id form error
		var intervalDispatcher = setInterval(function() {
			var spElement = $('ul.woocommerce-error li:contains("simplepay_transaction_id")');
			if (spElement.length === 1) {
				$('ul.woocommerce-error li:contains("simplepay_transaction_id")').css('display', 'none');
				clearInterval(intervalDispatcher);
			}
   		}, 100);

		var checkoutForm = $('form.checkout');
		
		if ($('#payment_method_simplepay').is(':checked')) {
			e.preventDefault();
			$('#simplepay_transaction_id').val('');

			$.ajax({
				type: 'POST',
				url: checkout_page.ajax_url,
				data: checkoutForm.serialize(),
				dataType: 'json',
				success: function(response) {
					$('body').append('<div id="tmp_simplepay" style="display: none">' + response.messages + '</div>');
    	
					if (response.result === 'failure') {
						if ($('#tmp_simplepay ul.woocommerce-error').children().length === 1) {
							var WCFirstName = $('input[name="billing_first_name"]').val();
							var WCLastName = $('input[name="billing_last_name"]').val();
							var WCPhone = $('input[name="billing_phone"]').val();
							var WCAddress = $('input[name="billing_address_1"]').val() + ' ' + $('input[name="billing_address_2"]').val();
							var WCCity = $('input[name="billing_city"]').val();
							var WCCountry = $('#billing_country').val();
							var WCPostCode = $('input[name="billing_postcode"]').val();
							var WCEmail = checkout_page.email === '' ? $('input[name="billing_email"]').val() : checkout_page.email;

							// Order amount + shipping costs
							var totalAmount = 0;
							var selectedShippingMethod = $('input[name^=shipping_method][type=radio]:checked').val();
							if (selectedShippingMethod !== undefined) {
								totalAmount = parseFloat(checkout_page.amount) + parseFloat(checkout_page.shipping[selectedShippingMethod].cost);
							
							} else {
								totalAmount = parseFloat(checkout_page.amount);
							}
							
							// Payment popup
							var handler = SimplePay.configure({
							   token: function(e) {
							   		$('#simplepay_transaction_id').val(e);

									// Proceed with the form submission
									checkoutForm.submit();
							   },
							   key: checkout_page.public_key,
							   platform: 'Wordpress',
							   image: checkout_page.custom_image,
							});

							var paymentData = {
								email: WCEmail,
								phone: WCPhone,
								description: checkout_page.title + ' - Order #' + checkout_page.order,
								address: WCAddress,
								postal_code: WCPostCode,
								city: WCCity,
								country: WCCountry,
								amount: formatAmount(totalAmount),
								currency: checkout_page.currency
							};

							if (window.mobilecheck()) {
								showMobilePayment();

								$('body').on('click', '#spProceedToMobilePayment', function() {
									$('#spMobilePaymentOverlay').remove();
									handler.open(SimplePay.CHECKOUT, paymentData);	
								});

								$('body').on('click', '#spCancelMobilePayment', function() {
									$('#spMobilePaymentOverlay').remove();
								});

							} else {
								handler.open(SimplePay.CHECKOUT, paymentData);
							}
						
						} else {
							// Proceed with the form submission - output form validation error
							checkoutForm.submit();
						}
					}
					$('#tmp_simplepay').remove();
				}
			});
		
		} else {
			$('#simplepay_transaction_id').val('#'); // This field is required, it need to put something to avoid conflicts with other payment gateways

			// Proceed with the form submission
			checkoutForm.submit();
		}
	});
});