from django import forms

class LoginForm(forms.Form):
    username = forms.CharField(max_length=50,label="",widget=forms.TextInput(attrs={"class":"username-input","placeholder":"Enter Username"}))

    password = forms.CharField(max_length=10,label="",widget=forms.PasswordInput(attrs={"class":"password-input","Placeholder":"Enter Password"}))

class RegisterForm(forms.Form):
    first_name = forms.CharField(max_length=10,label="",widget=forms.TextInput(attrs={"class":"firstname-input","placeholder":"Enter Firstname"}))

    last_name = forms.CharField(max_length=10,label="",widget=forms.TextInput(attrs={"class":"lastname-input","placeholder":"Enter Lastname"}))

    email = forms.CharField(max_length=50,label="",widget=forms.TextInput(attrs={"class":"email-input","placeholder":"Enter Email"}))

    username = forms.CharField(max_length=50,label="",widget=forms.TextInput(attrs={"class":"username-input","placeholder":"Enter Username"}))

    password = forms.CharField(max_length=10,label="",widget=forms.PasswordInput(attrs={"class":"password-input","placeholder":"Choose a Strong Password"}))