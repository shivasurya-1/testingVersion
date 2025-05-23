#include<stdio.h>
#include<math.h>
int main()
{
    int a,b,c;
    float discriminant,root1,root2,realPart,imaginaryPart;
    
    printf("Enter coefficients a,b and c:");
    scanf("%d%d%d",&a,&b,&c);
    if(a==0) 
    {   printf("Not a quadratic equation.\n");
        return 1;
    }
    discriminant=b*b-4*a*c;
    
    if (discriminant>0) {
        root1=(-b+ sqrt(discriminant))/(2*a);
        root2=(-b- sqrt(discriminant))/(2*a);
        printf ("Roots are real and distinct.\n");
        printf ("Root 1 = %.3f\n",root1);
        printf ("Root 2 = %.3f\n",root2);
        
    }
    else if (discriminant ==0) {
        root1=-b/(2*a);
        printf("Roots are real and repeated.\n");
        printf("Root 1 = Root 2 = %.3f",root1);
    }
    else 
    {
        double realPart = -b/(2*a);
        double imaginaryPart = sqrt (-discriminant)/(2*a);
        printf("Roots are complex.\n" );
        printf("Root 1 = %.3f + %.3fi\n", realPart,imaginaryPart);
        printf("Root 2 = %.3f - %.3fi\n", realPart,imaginaryPart);
        
    }
}
